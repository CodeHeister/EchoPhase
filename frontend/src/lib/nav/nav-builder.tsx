import { For, Show, createSignal, onCleanup } from 'solid-js';
import type { NavLink, NavSubItem } from '@lib/nav';
import '@styles/navbar.scss';

function SubMenuItem(props: { item: NavSubItem; onClose: () => void }) {
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
                    props.item.events?.onClick?.(e as any);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        props.onClose();
                        props.item.events?.onKeyDown?.(e as any);
                    } else if (e.key === 'Escape') {
                        props.onClose();
                    }
                }}
                {...props.item.events}
            >
                <Show when={Icon}>
                    <i class="submenu-icon" aria-hidden="true">
                        <Icon />
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

function NavItem(props: { link: NavLink; isLogo: boolean }) {
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
                        props.link.events?.onClick?.(e as any);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (hasItems()) {
                            toggleSubmenu();
                        } else {
                            props.link.events?.onKeyDown?.(e as any);
                        }
                    } else if (e.key === 'Escape' && isOpen()) {
                        setIsOpen(false);
                    }
                }}
                {...(!hasItems() ? props.link.events : {})}
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
                            <SubMenuItem
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

export function NavBuilder(props: { links: NavLink[] }) {
    return (
        <nav class="navbar">
            <ul class="navbar-nav">
                <For each={props.links}>
                    {(link, index) => (
                        <NavItem link={link} isLogo={index() === 0} />
                    )}
                </For>
            </ul>
        </nav>
    );
}
