import { Component } from 'solid-js';

/**
 * Handlers a nav entry may have. The nav components call them from their
 * own handlers (which also close menus), so they are not spread onto the
 * element: a spread would replace those.
 */
export interface NavEvents<T extends HTMLElement> {
    onClick?: (event: MouseEvent & { currentTarget: T }) => void;
    onKeyDown?: (event: KeyboardEvent & { currentTarget: T }) => void;
}

export interface NavSubItem {
    icon?: Component;
    label: string;
    description?: string;
    events?: NavEvents<HTMLElement>;
}

export interface NavLink {
    icon: Component;
    text: string;
    items?: NavSubItem[];
    events?: NavEvents<HTMLElement>;
}
