import { Show } from 'solid-js';
import type { NavLink } from '@lib/nav';
import { DesktopNav, MobileNav, useIsMobile } from '@lib/nav';

/**
 * Smart wrapper that renders either MobileNav or DesktopNav
 * based on viewport width. The navLinks array is shared via
 * the parent's signal — switching layouts never resets it.
 */
export function NavBuilder(props: { links: NavLink[] }) {
    const isMobile = useIsMobile();

    return (
        <Show when={isMobile()} fallback={<DesktopNav links={props.links} />}>
            <MobileNav links={props.links} />
        </Show>
    );
}
