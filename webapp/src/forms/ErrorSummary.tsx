import { createEffect, For, Show } from 'solid-js';
import { FORM, type FormErrors } from '@lib/api';
import { useI18n } from '@lib/i18n';

/**
 * All of a form's errors at its top, focused after a failed submit so screen
 * readers announce them. Field errors link to their input (#id), which moves
 * focus there; errors about the request as a whole are listed without a link.
 */
export default function ErrorSummary(props: {
    errors: FormErrors;
    /** Input id for a field name, e.g. "login-username". */
    inputId: (field: string) => string;
}) {
    const i18n = useI18n();
    let ref: HTMLDivElement | undefined;

    const entries = () =>
        Object.entries(props.errors).flatMap(([field, items]) =>
            items.map((item) => ({ field, item }))
        );

    createEffect(() => {
        if (entries().length > 0) ref?.focus();
    });

    return (
        <Show when={entries().length > 0}>
            <div class="error-summary" role="alert" tabindex="-1" ref={ref}>
                <ul class="errorlist">
                    <For each={entries()}>
                        {({ field, item }) => {
                            const text = i18n.t(item.code, item.message);
                            return (
                                <li>
                                    {field === FORM ? (
                                        text
                                    ) : (
                                        <a href={`#${props.inputId(field)}`}>
                                            {text}
                                        </a>
                                    )}
                                </li>
                            );
                        }}
                    </For>
                </ul>
            </div>
        </Show>
    );
}
