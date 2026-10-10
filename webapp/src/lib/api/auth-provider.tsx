import {
    createContext,
    useContext,
    ParentComponent,
    createSignal,
    createResource,
    Accessor,
} from 'solid-js';
import type {
    User,
    LoginCredentials,
    RegisterData,
    ProfileUpdate,
    ErrorItem,
} from '@lib/api';
import { CsrfService } from '@lib/csrf';
import { readErrors } from './errors';

interface AuthContextValue {
    /** undefined while loading, null when signed out. */
    user: Accessor<User | null | undefined>;
    roles: Accessor<string[] | null | undefined>;
    refetchUser: () =>
        User | null | undefined | Promise<User | null | undefined>;
    isAuthenticated: Accessor<boolean>;
    isLoading: Accessor<boolean>;
    csrfToken: Accessor<string | null>;
    refetchCsrf: () => Promise<string | null>;
    login: (
        credentials: LoginCredentials
    ) => Promise<{ success: boolean; error?: ErrorItem[] }>;
    register: (
        data: RegisterData
    ) => Promise<{ success: boolean; error?: ErrorItem[] }>;
    updateProfile: (
        data: ProfileUpdate
    ) => Promise<{ success: boolean; error?: ErrorItem[] }>;
    logout: () => Promise<void>;
    addCsrfToken: () => Record<string, string>;
    hasCsrfToken: () => boolean;
}

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider: ParentComponent = (props) => {
    const [isLoading, setIsLoading] = createSignal(false);

    const fetchMe = async (): Promise<User | null> => {
        const res = await fetch(`/api/v1/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return null;
        return res.json();
    };

    const [user, { refetch: refetchUser, mutate: setUser }] =
        createResource<User | null>(fetchMe);

    const isAuthenticated = () => !!user();

    const fetchRoles = async (): Promise<string[] | null> => {
        if (!isAuthenticated()) return null;
        const res = await fetch(`/api/v1/roles/me`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return null;
        return res.json();
    };

    const [roles, { refetch: refetchRoles }] = createResource<
        string[] | null,
        boolean
    >(() => isAuthenticated(), fetchRoles);

    const [csrfToken, setCsrfToken] = createSignal<string | null>(
        CsrfService.getToken()
    );

    const refetchCsrf = async (): Promise<string | null> => {
        CsrfService.clearToken();
        setCsrfToken(null);
        return null;
    };

    const addCsrfToken = (): Record<string, string> => {
        const t = csrfToken();
        if (!t) throw new Error('CSRF token is not available.');
        return { [CsrfService.HEADER]: t };
    };

    const hasCsrfToken = () => csrfToken() !== null;

    const signedIn = async (res: Response) => {
        const token = res.headers.get(CsrfService.HEADER);
        if (token) {
            CsrfService.saveToken(token);
            setCsrfToken(token);
        }
        await refetchUser();
        await refetchRoles();
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/auth/login`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            if (res.ok) {
                await signedIn(res);
                return { success: true };
            } else {
                return { success: false, error: await readErrors(res) };
            }
        } catch {
            return {
                success: false,
                error: [
                    {
                        code: 'network_error',
                        message: 'Network error occurred',
                    },
                ],
            };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: RegisterData) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/auth/register`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                // Registering also signs in: same cookies and CSRF token as login.
                await signedIn(res);
                return { success: true };
            } else {
                return { success: false, error: await readErrors(res) };
            }
        } catch {
            return {
                success: false,
                error: [
                    {
                        code: 'network_error',
                        message: 'Network error occurred',
                    },
                ],
            };
        } finally {
            setIsLoading(false);
        }
    };

    // Changes the signed-in user's name and/or time zone; omitted fields stay.
    const updateProfile = async (data: ProfileUpdate) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/auth/me`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...addCsrfToken(),
                },
                body: JSON.stringify(data),
            });
            if (!res.ok)
                return { success: false, error: await readErrors(res) };
            setUser((await res.json()) as User);
            return { success: true };
        } catch {
            return {
                success: false,
                error: [
                    {
                        code: 'network_error',
                        message: 'Network error occurred',
                    },
                ],
            };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            setIsLoading(true);
            // Revokes this device's session and clears the token cookies.
            await fetch(`/api/v1/sessions/current`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...addCsrfToken(),
                },
            });
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            await refetchUser();
            await refetchRoles();
            await refetchCsrf();
            setIsLoading(false);
        }
    };

    const value: AuthContextValue = {
        user,
        roles,
        refetchUser,
        isAuthenticated,
        isLoading,
        csrfToken,
        refetchCsrf,
        login,
        register,
        updateProfile,
        logout,
        addCsrfToken,
        hasCsrfToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {props.children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
