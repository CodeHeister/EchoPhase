import { createSignal, onCleanup, onMount } from 'solid-js';

const MOBILE_BREAKPOINT = 768;

/**
 * Reactive hook that returns true when viewport width < 768px.
 * Uses matchMedia so it never triggers a full re-render of tree —
 * only the components that read isMobile() re-evaluate.
 */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const [isMobile, setIsMobile] = createSignal(query.matches);

    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    onMount(() => {
        query.addEventListener('change', onChange);
    });

    onCleanup(() => {
        query.removeEventListener('change', onChange);
    });

    return isMobile;
}
