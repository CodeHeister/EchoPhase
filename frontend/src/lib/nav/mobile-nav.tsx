import { For, Show, createSignal, createMemo, onCleanup } from 'solid-js';
import { IoEllipsisHorizontal } from 'solid-icons/io';
import type { NavLink, NavSubItem } from '@lib/nav';
import '@styles/navbar.scss';

const MAX_VISIBLE = 4;

type SheetMode =
    | { kind: 'submenu'; items: NavSubItem[] }
    | { kind: 'overflow'; links: NavLink[] };

// ─── MobileBottomSheet ────────────────────────────────────────────────────────

function MobileBottomSheet(props: {
    mode: SheetMode;
    onClose: () => void;
    openSheet: (mode: SheetMode) => void;
}) {
    return (
        <>
            <div
                class="mobile-sheet-backdrop"
                onClick={props.onClose}
                aria-hidden="true"
            />
            <div
                class="mobile-sheet"
                role="menu"
                aria-label={
                    props.mode.kind === 'overflow' ? 'More items' : 'Submenu'
                }
            >
                <div class="mobile-sheet-handle" aria-hidden="true" />

                <Show when={props.mode.kind === 'submenu'}>
                    <ul class="mobile-sheet-list">
                        <For each={(props.mode as { kind: 'submenu'; items: NavSubItem[] }).items}>
                            {(item) => {
                                const Icon = item.icon;
                                return (
                                    <li role="none">
                                        <div
                                            class="mobile-sheet-item"
                                            role="menuitem"
                                            tabIndex={0}
                                            aria-label={item.label}
                                            onClick={(e) => {
                                                props.onClose();
                                                item.events?.onClick?.(e as any);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    props.onClose();
                                                    item.events?.onKeyDown?.(e as any);
                                                } else if (e.key === 'Escape') {
                                                    props.onClose();
                                                }
                                            }}
                                        >
                                            <Show when={Icon}>
                                                <i class="submenu-icon" aria-hidden="true">
                                                    <Icon />
                                                </i>
                                            </Show>
                                            <div class="submenu-content">
                                                <span class="submenu-label">{item.label}</span>
                                                <Show when={item.description}>
                                                    <span class="submenu-description">
                                                        {item.description}
                                                    </span>
                                                </Show>
                                            </div>
                                        </div>
                                    </li>
                                );
                            }}
                        </For>
                    </ul>
                </Show>

                <Show when={props.mode.kind === 'overflow'}>
                    <ul class="mobile-sheet-list">
                        <For each={(props.mode as { kind: 'overflow'; links: NavLink[] }).links}>
                            {(link) => {
                                const hasItems = !!link.items?.length;
                                return (
                                    <li role="none">
                                        <div
                                            class="mobile-sheet-item mobile-sheet-item--link"
                                            role="menuitem"
                                            tabIndex={0}
                                            aria-label={link.text}
                                            aria-haspopup={hasItems ? 'menu' : undefined}
                                            onClick={(e) => {
                                                if (hasItems) {
                                                    props.openSheet({
                                                        kind: 'submenu',
                                                        items: link.items!,
                                                    });
                                                } else {
                                                    props.onClose();
                                                    link.events?.onClick?.(e as any);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    if (hasItems) {
                                                        props.openSheet({
                                                            kind: 'submenu',
                                                            items: link.items!,
                                                        });
                                                    } else {
                                                        props.onClose();
                                                        link.events?.onKeyDown?.(e as any);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    props.onClose();
                                                }
                                            }}
                                        >
                                            <i class="submenu-icon" aria-hidden="true">
                                                <link.icon />
                                            </i>
                                            <div class="submenu-content">
                                                <span class="submenu-label">{link.text}</span>
                                                <Show when={hasItems}>
                                                    <span class="submenu-description">
                                                        {link.items!.length} items
                                                    </span>
                                                </Show>
                                            </div>
                                            <Show when={hasItems}>
                                                <i class="mobile-sheet-chevron" aria-hidden="true" />
                                            </Show>
                                        </div>
                                    </li>
                                );
                            }}
                        </For>
                    </ul>
                </Show>
            </div>
        </>
    );
}

// ─── MobileNavItem ────────────────────────────────────────────────────────────

function MobileNavItem(props: {
    link: NavLink;
    openSheet: (mode: SheetMode) => void;
}) {
    const hasItems = () => !!props.link.items?.length;

    return (
        <li class="mobile-nav-item">
            <button
                class="mobile-nav-btn"
                aria-label={props.link.text}
                aria-haspopup={hasItems() ? 'menu' : undefined}
                onClick={(e) => {
                    if (hasItems()) {
                        props.openSheet({ kind: 'submenu', items: props.link.items! });
                    } else {
                        props.link.events?.onClick?.(e as any);
                    }
                }}
            >
                <i class="nav-icon" aria-hidden="true">
                    <props.link.icon />
                </i>
                <span class="mobile-nav-label">{props.link.text}</span>
            </button>
        </li>
    );
}

// ─── MobileMoreButton ─────────────────────────────────────────────────────────

function MobileMoreButton(props: { count: number; onClick: () => void }) {
    return (
        <li class="mobile-nav-item">
            <button
                class="mobile-nav-btn"
                aria-label={`More navigation items (${props.count})`}
                aria-haspopup="menu"
                onClick={props.onClick}
            >
                <i class="nav-icon" aria-hidden="true">
                    <IoEllipsisHorizontal />
                </i>
                <span class="mobile-nav-label">More</span>
            </button>
        </li>
    );
}

// ─── MobileNav ────────────────────────────────────────────────────────────────

export function MobileNav(props: { links: NavLink[] }) {
    const [sheet, setSheet] = createSignal<SheetMode | null>(null);

    const openSheet = (mode: SheetMode) => setSheet(mode);
    const closeSheet = () => setSheet(null);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeSheet();
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));

    const visibleLinks = createMemo(() =>
        props.links.length > MAX_VISIBLE
            ? props.links.slice(0, MAX_VISIBLE - 1)
            : props.links
    );

    const overflowLinks = createMemo(() =>
        props.links.length > MAX_VISIBLE
            ? props.links.slice(MAX_VISIBLE - 1)
            : []
    );

    const hasOverflow = () => overflowLinks().length > 0;

    return (
        <>
            <nav class="navbar navbar--mobile" aria-label="Mobile navigation">
                <ul class="mobile-navbar-nav">
                    <For each={visibleLinks()}>
                        {(link) => (
                            <MobileNavItem link={link} openSheet={openSheet} />
                        )}
                    </For>

                    <Show when={hasOverflow()}>
                        <MobileMoreButton
                            count={overflowLinks().length}
                            onClick={() =>
                                openSheet({ kind: 'overflow', links: overflowLinks() })
                            }
                        />
                    </Show>
                </ul>
            </nav>

            <Show when={sheet() !== null}>
                <MobileBottomSheet
                    mode={sheet()!}
                    onClose={closeSheet}
                    openSheet={openSheet}
                />
            </Show>
        </>
    );
}
