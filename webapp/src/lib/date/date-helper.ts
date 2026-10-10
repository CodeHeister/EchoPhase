export class DateHelper {
    /**
     * Returns the expiration date after the specified number of minutes from now.
     * @param minutes Number of minutes until expiration
     */
    static expiresInMinutes(minutes: number): Date {
        const d = new Date();
        d.setTime(d.getTime() + minutes * 60 * 1000);
        return d;
    }

    /**
     * Returns the expiration date after the specified number of hours from now.
     * @param hours Number of hours until expiration
     */
    static expiresInHours(hours: number): Date {
        const d = new Date();
        d.setTime(d.getTime() + hours * 60 * 60 * 1000);
        return d;
    }

    /**
     * Returns the expiration date after the specified number of days from now.
     * @param days Number of days until expiration
     */
    static expiresInDays(days: number): Date {
        const d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        return d;
    }

    /**
     * Returns the expiration date after the specified number of seconds from now.
     * @param seconds Number of seconds until expiration
     */
    static expiresInSeconds(seconds: number): Date {
        const d = new Date();
        d.setTime(d.getTime() + seconds * 1000);
        return d;
    }

    /**
     * The moment a <input type="datetime-local"> value means in the browser's
     * time zone, as ISO 8601 UTC ("...Z"), the form the API requires; null for
     * an empty or invalid value.
     */
    static fromLocalInput(value: string): string | null {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    /** A date as a datetime-local value ("YYYY-MM-DDTHH:mm") in the browser's zone. */
    static toLocalInput(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return (
            `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
            `T${pad(date.getHours())}:${pad(date.getMinutes())}`
        );
    }

    /**
     * An API time (ISO 8601) for display, in the given IANA zone (the user's
     * profile zone) or the browser's; empty for null.
     */
    static format(
        iso: string | null | undefined,
        timeZone?: string,
        locale?: string
    ): string {
        if (!iso) return '';
        try {
            return new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone,
            }).format(new Date(iso));
        } catch {
            // Unknown zone in this browser: fall back to its own.
            return new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(iso));
        }
    }

    /**
     * The browser's IANA time zone, e.g. "Europe/Moscow", or undefined when
     * the runtime does not report one (the server then defaults to UTC).
     */
    static browserTimeZone(): string | undefined {
        try {
            return (
                Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
            );
        } catch {
            return undefined;
        }
    }
}

export default DateHelper;
