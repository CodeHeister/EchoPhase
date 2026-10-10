import { createSignal, For, Show } from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { useRealtimeEvent, type RealtimeEvent } from '@lib/realtime';
import { useI18n } from '@lib/i18n';
import '@styles/notices.scss';

interface Notice {
    id: number;
    title: string;
    text: string;
}

const MaxNotices = 5;

/**
 * Things the server tells the user while they are on the site: a connection
 * whose token was rejected, a Discord gateway that stopped. Dismissable;
 * the newest few are kept.
 */
export default function RealtimeNotices() {
    const i18n = useI18n();
    const [notices, setNotices] = createSignal<Notice[]>([]);
    let nextId = 0;

    const add = (title: string, text: string) =>
        setNotices((list) =>
            [...list, { id: nextId++, title, text }].slice(-MaxNotices)
        );
    const dismiss = (id: number) =>
        setNotices((list) => list.filter((n) => n.id !== id));

    useRealtimeEvent('connection.reauth_required', (event: RealtimeEvent) => {
        const connection = event.connection as
            { name?: string; provider?: string } | undefined;
        add(
            i18n.t('notice.reauth.title', 'Connection needs attention'),
            i18n.t('notice.reauth.text', 'Reconnect') +
                ` ${connection?.provider ?? ''} "${connection?.name ?? ''}".`
        );
    });

    useRealtimeEvent('discord_gateway.failed', (event: RealtimeEvent) => {
        const gateway = event.gateway as
            { connection?: string; message?: string } | undefined;
        add(
            i18n.t('notice.discord.title', 'Discord gateway stopped') +
                ` (${gateway?.connection ?? ''})`,
            gateway?.message ?? ''
        );
    });

    return (
        <Show when={notices().length > 0}>
            <div class="notices" role="status" aria-live="polite">
                <For each={notices()}>
                    {(notice) => (
                        <div class="notice">
                            <div class="notice-body">
                                <strong>{notice.title}</strong>
                                <p>{notice.text}</p>
                            </div>
                            <button
                                class="notice-close"
                                aria-label={i18n.t('notice.dismiss', 'Dismiss')}
                                onClick={() => dismiss(notice.id)}
                            >
                                <AiOutlineClose />
                            </button>
                        </div>
                    )}
                </For>
            </div>
        </Show>
    );
}
