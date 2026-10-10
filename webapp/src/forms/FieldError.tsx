import { For, Show } from 'solid-js';
import type { ErrorItem } from '@lib/api';
import { useI18n } from '@lib/i18n';

/** Id of an input's error list; the input points at it with aria-describedby. */
export const errorId = (inputId: string) => `${inputId}-error`;

/** Messages for one input, rendered under it. */
export default function FieldError(props: {
    for: string;
    errors?: ErrorItem[];
}) {
    const i18n = useI18n();

    return (
        <Show when={props.errors?.length}>
            <ul class="errorlist field-errors" id={errorId(props.for)}>
                <For each={props.errors}>
                    {(error) => <li>{i18n.t(error.code, error.message)}</li>}
                </For>
            </ul>
        </Show>
    );
}
