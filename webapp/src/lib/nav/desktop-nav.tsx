import { For, Show, createSignal, onCleanup } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { NavLink, NavSubItem } from '@lib/nav';
import '@styles/navbar.scss';

// ─── SubMenuItem ──────────────────────────────────────────────────────────────

function DesktopSubMenuItem(props: { item: NavSubItem; onClose: () => void }) {
    const Icon = props.item.icon;
    return (
        <li role="none">
            <div
                class="nav-submenu-item"
                role="menuitem"
                tabIndex={0}
                aria-label={props.item.label}
                onClick={(e) => {
                    props.onClose();
                    props.item.events?.onClick?.(e);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        props.onClose();
                        props.item.events?.onKeyDown?.(e);
                    } else if (e.key === 'Escape') {
                        props.onClose();
                    }
                }}
            >
                <Show when={Icon}>
                    <i class="submenu-icon" aria-hidden="true">
                        <Dynamic component={Icon} />
                    </i>
                </Show>
                <div class="submenu-content">
                    <span class="submenu-label">{props.item.label}</span>
                    <Show when={props.item.description}>
                        <span class="submenu-description">
                            {props.item.description}
                        </span>
                    </Show>
                </div>
            </div>
        </li>
    );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function DesktopNavItem(props: { link: NavLink; isLogo: boolean }) {
    const [isOpen, setIsOpen] = createSignal(false);
    let itemRef: HTMLLIElement | undefined;

    const hasItems = () => !!props.link.items?.length;

    const handleClickOutside = (e: MouseEvent) => {
        if (itemRef && !itemRef.contains(e.target as Node)) {
            setIsOpen(false);
            document.removeEventListener('click', handleClickOutside);
        }
    };

    const toggleSubmenu = () => {
        const next = !isOpen();
        setIsOpen(next);
        if (next) {
            document.addEventListener('click', handleClickOutside);
        } else {
            document.removeEventListener('click', handleClickOutside);
        }
    };

    onCleanup(() => {
        document.removeEventListener('click', handleClickOutside);
    });

    return (
        <li
            ref={itemRef}
            class={props.isLogo ? 'logo' : 'nav-item'}
            data-has-items={hasItems() || undefined}
            data-open={isOpen() || undefined}
        >
            <div
                class="nav-link"
                role="button"
                tabIndex={0}
                aria-label={props.link.text}
                aria-expanded={hasItems() ? isOpen() : undefined}
                aria-haspopup={hasItems() ? 'menu' : undefined}
                onClick={(e) => {
                    if (hasItems()) {
                        e.stopPropagation();
                        toggleSubmenu();
                    } else {
                        props.link.events?.onClick?.(e);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (hasItems()) {
                            toggleSubmenu();
                        } else {
                            props.link.events?.onKeyDown?.(e);
                        }
                    } else if (e.key === 'Escape' && isOpen()) {
                        setIsOpen(false);
                    }
                }}
            >
                <i class="nav-icon">
                    <props.link.icon />
                </i>
                <span class="link-text">{props.link.text}</span>
                <Show when={hasItems()}>
                    <i class="nav-chevron" aria-hidden="true" />
                </Show>
            </div>

            <Show when={hasItems() && isOpen()}>
                <ul class="nav-submenu" role="menu">
                    <For each={props.link.items}>
                        {(item) => (
                            <DesktopSubMenuItem
                                item={item}
                                onClose={() => setIsOpen(false)}
                            />
                        )}
                    </For>
                </ul>
            </Show>
        </li>
    );
}

// ─── DesktopNav ───────────────────────────────────────────────────────────────

/**
 * Vertical sidebar navigation for desktop (≥768px).
 * Expands on hover to show link labels and chevrons.
 */
export function DesktopNav(props: { links: NavLink[] }) {
    return (
        <nav class="navbar navbar--desktop" aria-label="Desktop navigation">
            <ul class="navbar-nav">
                <For each={props.links}>
                    {(link, index) => (
                        <DesktopNavItem link={link} isLogo={index() === 0} />
                    )}
                </For>
            </ul>
        </nav>
    );
}
