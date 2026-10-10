import {
    createContext,
    useContext,
    createSignal,
    createResource,
    JSX,
} from 'solid-js';
import localesList from '@static/locales.json';

export interface Translations {
    [key: string]: string | Translations;
}

interface LocaleDefinition {
    nativeName: string;
}

interface I18nContextType {
    currentLocale: () => string;
    translations: () => Translations | undefined;
    setLocale: (locale: string) => Promise<void>;
    t: (key: string, fallback?: string) => string;
    availableLocales: () => { code: string; nativeName: string }[] | undefined;
    isLoading: () => boolean;
    loadNamespace: (namespace: string, locale: string) => Promise<Translations>;
}

const defaultLocale = 'en';
const STORAGE_KEY = 'app_locale';

const localeLoaders = import.meta.glob<string>('@static/locales/*.json', {
    query: '?raw',
    import: 'default',
    eager: false,
});

const namespaceLoaders = import.meta.glob<string>('@static/locales/*.*.json', {
    query: '?raw',
    import: 'default',
    eager: false,
});

const normalizedNamespaceLoaders = Object.keys(namespaceLoaders).reduce(
    (acc, path) => {
        const match = path.match(/\/([^/]+)\.([a-z]{2})\.json$/);
        if (match) {
            const [, namespace, locale] = match;
            acc[`${namespace}.${locale}`] = namespaceLoaders[path];
        }
        return acc;
    },
    {} as Record<string, () => Promise<string>>
);

const namespaceCache = new Map<string, Translations>();

const I18nContext = createContext<I18nContextType>();

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}

export function useLocalizer(namespace?: string) {
    const { currentLocale, t, loadNamespace } = useI18n();

    const [nsTranslations] = createResource(
        () => (namespace ? `${namespace}.${currentLocale()}` : null),
        async () => {
            if (!namespace) return null;
            return loadNamespace(namespace, currentLocale());
        }
    );

    return (key: string, fallback?: string): string => {
        if (!namespace) {
            return t(key, fallback);
        }

        const trans = nsTranslations();
        if (!trans) return fallback ?? key;

        const parts = key.split('.');
        let current: string | Translations | undefined = trans;
        for (const part of parts) {
            if (
                current == null ||
                typeof current !== 'object' ||
                !(part in current)
            ) {
                return fallback ?? key;
            }
            current = current[part];
        }
        return typeof current === 'string' ? current : (fallback ?? key);
    };
}

export function I18nProvider(props: { children: JSX.Element }) {
    const localeDefinitions: Record<string, LocaleDefinition> = localesList;

    function getAvailableLocales(): { code: string; nativeName: string }[] {
        return Object.keys(localeLoaders)
            .map((path) => {
                const match = path.match(/\/([^/]+)\.json$/);
                const code = match?.[1];
                if (!code || !localeDefinitions[code]) return null;
                return { code, nativeName: localeDefinitions[code].nativeName };
            })
            .filter(
                (locale): locale is { code: string; nativeName: string } =>
                    locale !== null
            );
    }

    const [availableLocales] = createResource(getAvailableLocales);

    function getBrowserLocale(): string | null {
        if (typeof navigator !== 'undefined') {
            const lang =
                navigator.language ||
                (navigator as Navigator & { userLanguage?: string })
                    .userLanguage;
            return lang?.slice(0, 2).toLowerCase() ?? null;
        }
        return null;
    }

    function getInitialLocale(): string {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && localeDefinitions[stored]) return stored;
        }
        const browserLocale = getBrowserLocale();
        if (browserLocale && localeDefinitions[browserLocale])
            return browserLocale;
        return defaultLocale;
    }

    const [currentLocale, setCurrentLocale] =
        createSignal<string>(getInitialLocale());

    const translationCache = new Map<string, Translations>();

    const normalizedLoaders = Object.keys(localeLoaders).reduce(
        (acc, path) => {
            const match = path.match(/\/([^/]+)\.json$/);
            const code = match?.[1];
            if (code) acc[code] = localeLoaders[path];
            return acc;
        },
        {} as Record<string, () => Promise<string>>
    );

    const [translations] = createResource(
        currentLocale,
        async (locale): Promise<Translations> => {
            if (translationCache.has(locale))
                return translationCache.get(locale)!;
            try {
                const loader = normalizedLoaders[locale];
                if (!loader)
                    throw new Error(`Loader not found for locale: ${locale}`);
                const raw = await loader();
                const loaded: Translations = JSON.parse(raw);
                translationCache.set(locale, loaded);
                if (typeof document !== 'undefined') {
                    document.documentElement.lang = locale;
                }
                return loaded;
            } catch (e) {
                console.error(`Error loading locale "${locale}":`, e);
                if (locale !== defaultLocale) {
                    if (translationCache.has(defaultLocale))
                        return translationCache.get(defaultLocale)!;
                    const defaultLoader = normalizedLoaders[defaultLocale];
                    if (defaultLoader) {
                        const raw = await defaultLoader();
                        const loaded = JSON.parse(raw);
                        translationCache.set(defaultLocale, loaded);
                        return loaded;
                    }
                }
                return {};
            }
        }
    );

    async function loadNamespace(
        namespace: string,
        locale: string
    ): Promise<Translations> {
        const key = `${namespace}.${locale}`;
        if (namespaceCache.has(key)) return namespaceCache.get(key)!;

        const loader = normalizedNamespaceLoaders[key];

        if (!loader) {
            if (locale !== defaultLocale) {
                const defaultKey = `${namespace}.${defaultLocale}`;
                if (namespaceCache.has(defaultKey))
                    return namespaceCache.get(defaultKey)!;
                const defaultLoader = normalizedNamespaceLoaders[defaultKey];
                if (defaultLoader) {
                    const raw = await defaultLoader();
                    const loaded: Translations = JSON.parse(raw);
                    namespaceCache.set(defaultKey, loaded);
                    return loaded;
                }
            }
            return translations() ?? {};
        }

        const raw = await loader();
        const loaded: Translations = JSON.parse(raw);
        namespaceCache.set(key, loaded);
        return loaded;
    }

    async function setLocale(locale: string): Promise<void> {
        const available = availableLocales();
        const isValid = available?.some((l) => l.code === locale);
        if (!isValid) {
            console.warn(
                `Locale "${locale}" not supported, fallback to '${defaultLocale}'`
            );
            locale = defaultLocale;
        }
        if (locale !== currentLocale()) {
            setCurrentLocale(locale);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, locale);
            }
        }
    }

    function t(key: string, fallback?: string): string {
        const trans = translations();
        if (!trans) return fallback ?? key;
        const parts = key.split('.');
        let current: string | Translations | undefined = trans;
        for (const part of parts) {
            if (
                current == null ||
                typeof current !== 'object' ||
                !(part in current)
            ) {
                return fallback ?? key;
            }
            current = current[part];
        }
        return typeof current === 'string' ? current : (fallback ?? key);
    }

    function isLoading(): boolean {
        return translations.loading || availableLocales.loading;
    }

    return (
        <I18nContext.Provider
            value={{
                currentLocale,
                translations,
                setLocale,
                t,
                availableLocales,
                isLoading,
                loadNamespace,
            }}
        >
            {props.children}
        </I18nContext.Provider>
    );
}
