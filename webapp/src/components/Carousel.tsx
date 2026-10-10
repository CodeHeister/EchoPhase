import { createSignal, createEffect, onCleanup, JSX } from 'solid-js';

export interface CarouselProps<T> {
    data: T[];
    render: (item: T, index: number) => JSX.Element;
    initialIndex?: number;
    delay?: number;
    onIndexChange?: (index: number) => void;
    buttonLabel?: (index: number) => string;
}

export default function Carousel<T>(props: CarouselProps<T>) {
    const [currentIndex, setCurrentIndex] = createSignal(
        props.initialIndex || 0
    );
    const [isHovered, setIsHovered] = createSignal(false);

    const handleIndexChange = (index: number) => {
        setCurrentIndex(index);
        props.onIndexChange?.(index);
    };

    createEffect(() => {
        if (props.delay) {
            let interval: ReturnType<typeof setInterval> | null = null;
            if (!isHovered()) {
                interval = setInterval(() => {
                    setCurrentIndex((prev) => (prev + 1) % props.data.length);
                }, props.delay);
            } else {
                if (interval) clearInterval(interval);
            }
            onCleanup(() => {
                if (interval) clearInterval(interval);
            });
        }
    });

    return (
        <div class="carousel">
            <div
                class="container"
                onPointerEnter={() => setIsHovered(true)}
                onPointerLeave={() => setIsHovered(false)}
            >
                {props.render(props.data[currentIndex()], currentIndex())}
            </div>
            <div
                class="buttons"
                onPointerEnter={() => setIsHovered(true)}
                onPointerLeave={() => setIsHovered(false)}
            >
                {props.data.map((_, i) => (
                    <button
                        data-active={currentIndex() === i}
                        disabled={currentIndex() === i}
                        tabIndex={currentIndex() === i ? -1 : 0}
                        onClick={() => handleIndexChange(i)}
                        onFocus={() => setIsHovered(true)}
                        onBlur={() => setIsHovered(false)}
                        aria-label={
                            props.buttonLabel?.(i) || `Switch to slide ${i + 1}`
                        }
                        class="button"
                    />
                ))}
            </div>
        </div>
    );
}
