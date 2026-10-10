import {
    createContext,
    createEffect,
    createSignal,
    on,
    onCleanup,
    useContext,
    type Accessor,
    type ParentComponent,
} from 'solid-js';
import { useAuth } from '@lib/api';
import {
    Op,
    type GatewayIntent,
    type ProtocolMessage,
    type RealtimeEvent,
    type RealtimeHandler,
    type RealtimeStatus,
} from './types';

interface RealtimeContextValue {
    status: Accessor<RealtimeStatus>;
    /** Intents the server confirmed for this connection. */
    intents: Accessor<string[]>;
    /** Calls handler for events of type ("*": all); returns the unsubscribe. */
    subscribe: (type: string, handler: RealtimeHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>();

const MaxBackoffMs = 30_000;

/**
 * The realtime gateway for the signed-in user: one WebSocket to /gateway/,
 * subscribed to the requested intents the token allows. Pings at half the
 * heartbeat interval the server announces; reconnects with backoff after a
 * drop, first asking /auth/me so an expired access token gets refreshed (or
 * a finished session ends the loop). Closed on sign-out.
 */
export const RealtimeProvider: ParentComponent<{ intents?: string[] }> = (
    props
) => {
    const auth = useAuth();
    const [status, setStatus] = createSignal<RealtimeStatus>('idle');
    const [intents, setIntents] = createSignal<string[]>([]);
    const handlers = new Map<string, Set<RealtimeHandler>>();

    let socket: WebSocket | undefined;
    let pingTimer: number | undefined;
    let retryTimer: number | undefined;
    let failures = 0;
    let wanted = false;

    const wantedIntents = () => props.intents ?? ['blocks', 'connections'];

    const dispatch = (event: RealtimeEvent) => {
        for (const key of [event.type, '*'])
            handlers.get(key)?.forEach((handler) => {
                try {
                    handler(event);
                } catch (err) {
                    console.error('Realtime handler failed:', err);
                }
            });
    };

    const send = (message: ProtocolMessage) => {
        if (socket?.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify(message));
    };

    // Only the intents the token may have: asking for others is an error.
    const allowedIntents = async (): Promise<string[]> => {
        try {
            const res = await fetch('/api/v1/gateway/intents', {
                credentials: 'include',
            });
            if (!res.ok) return [];
            const all = (await res.json()) as GatewayIntent[];
            const allowed = new Set(
                all.filter((i) => i.allowed).map((i) => i.name)
            );
            return wantedIntents().filter((name) => allowed.has(name));
        } catch {
            return [];
        }
    };

    const stopTimers = () => {
        window.clearInterval(pingTimer);
        window.clearTimeout(retryTimer);
        pingTimer = retryTimer = undefined;
    };

    const connect = async () => {
        if (!wanted) return;
        setStatus(failures === 0 ? 'connecting' : 'reconnecting');
        const subscribeTo = await allowedIntents();
        if (!wanted) return;

        const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${scheme}://${location.host}/gateway/`);
        socket = ws;

        ws.onopen = () =>
            send({ op: Op.Handshake, d: { intents: subscribeTo } });

        ws.onmessage = (message) => {
            let data: ProtocolMessage | RealtimeEvent;
            try {
                data = JSON.parse(message.data as string);
            } catch {
                return;
            }

            if ('op' in data) {
                const protocol = data as ProtocolMessage;
                if (protocol.op === Op.HandshakeAck) {
                    failures = 0;
                    setIntents(protocol.d?.intents ?? []);
                    setStatus('open');
                    const interval =
                        (protocol.d?.heartbeatInterval ?? 45_000) / 2;
                    window.clearInterval(pingTimer);
                    pingTimer = window.setInterval(
                        () => send({ op: Op.Ping }),
                        interval
                    );
                } else if (protocol.op === Op.Error) {
                    console.warn(
                        'Realtime gateway error:',
                        protocol.d?.message
                    );
                }
                return;
            }

            const event = data as RealtimeEvent;
            if (typeof event.type === 'string') dispatch(event);
        };

        ws.onclose = () => {
            if (socket !== ws) return;
            socket = undefined;
            window.clearInterval(pingTimer);
            setIntents([]);
            if (!wanted) {
                setStatus('idle');
                return;
            }
            setStatus('reconnecting');
            failures++;
            const delay =
                Math.min(MaxBackoffMs, 1000 * 2 ** (failures - 1)) *
                (1 + Math.random() / 2);
            retryTimer = window.setTimeout(async () => {
                // Refreshes an expired access token through the refresh
                // cookie; a 401 means the session is over.
                const me = await fetch('/api/v1/auth/me', {
                    credentials: 'include',
                }).catch(() => undefined);
                if (me?.status === 401) {
                    await auth.refetchUser();
                    return;
                }
                void connect();
            }, delay);
        };
    };

    const disconnect = () => {
        wanted = false;
        stopTimers();
        const ws = socket;
        socket = undefined;
        if (ws && ws.readyState <= WebSocket.OPEN) ws.close(1000, 'Signed out');
        setIntents([]);
        setStatus('idle');
    };

    createEffect(
        on(auth.isAuthenticated, (signedIn) => {
            if (signedIn && !wanted) {
                wanted = true;
                failures = 0;
                void connect();
            } else if (!signedIn && wanted) {
                disconnect();
            }
        })
    );

    onCleanup(disconnect);

    const subscribe = (type: string, handler: RealtimeHandler) => {
        let set = handlers.get(type);
        if (!set) handlers.set(type, (set = new Set()));
        set.add(handler);
        return () => set!.delete(handler);
    };

    return (
        <RealtimeContext.Provider value={{ status, intents, subscribe }}>
            {props.children}
        </RealtimeContext.Provider>
    );
};

export const useRealtime = () => {
    const context = useContext(RealtimeContext);
    if (!context)
        throw new Error('useRealtime must be used within RealtimeProvider');
    return context;
};

/** Handles events of a type for as long as the calling component lives. */
export const useRealtimeEvent = (type: string, handler: RealtimeHandler) => {
    const { subscribe } = useRealtime();
    onCleanup(subscribe(type, handler));
};
