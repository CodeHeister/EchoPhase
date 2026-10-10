import type { ErrorItem } from './types';

/** Errors keyed by input name; errors not tied to an input are under FORM. */
export type FormErrors = Record<string, ErrorItem[]>;

export const FORM = 'form';

/** Reads the API's error body: ErrorBody[], a single ErrorBody, or anything else. */
export async function readErrors(res: Response): Promise<ErrorItem[]> {
    try {
        const body = await res.json();
        if (Array.isArray(body)) return body;
        if (body && typeof body.code === 'string') return [body];
    } catch {
        // Not JSON (e.g. a proxy's error page).
    }
    return [
        {
            code: `http_${res.status}`,
            message: res.statusText || 'Request failed',
        },
    ];
}

/**
 * Groups errors by the input they are about. A field the form does not show
 * falls back to FORM, so no error is ever silently dropped.
 */
export function groupErrors(
    items: ErrorItem[],
    fields: readonly string[]
): FormErrors {
    const grouped: FormErrors = {};
    for (const item of items) {
        const key =
            item.field && fields.includes(item.field) ? item.field : FORM;
        (grouped[key] ??= []).push(item);
    }
    return grouped;
}
