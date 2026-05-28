import { Component, JSX } from 'solid-js';

export interface NavSubItem {
    icon?: Component;
    label: string;
    description?: string;
    events?: Partial<
        Record<
            keyof JSX.EventHandlerUnion<HTMLDivElement, Event>,
            JSX.EventHandlerUnion<HTMLDivElement, Event>
        >
    >;
}

export interface NavLink {
    icon: Component;
    text: string;
    items?: NavSubItem[];
    events?: Partial<
        Record<
            keyof JSX.EventHandlerUnion<HTMLButtonElement, Event>,
            JSX.EventHandlerUnion<HTMLButtonElement, Event>
        >
    >;
}
