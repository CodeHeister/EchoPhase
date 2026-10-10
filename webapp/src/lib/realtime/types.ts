/** Op codes of the gateway protocol (see EchoPhase.WebSockets OpCodes). */
export const Op = {
    Handshake: 0,
    HandshakeAck: 1,
    Disconnect: 2,
    DisconnectAck: 3,
    Ping: 4,
    Pong: 5,
    Adjust: 6,
    AdjustAck: 7,
    Error: 9,
} as const;

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'reconnecting';

/** A server event: { type: "block_run.progress", ...data }. */
export interface RealtimeEvent {
    type: string;
    [key: string]: unknown;
}

export type RealtimeHandler = (event: RealtimeEvent) => void;

/** One entry of GET /api/v1/gateway/intents. */
export interface GatewayIntent {
    name: string;
    resource?: string;
    permission?: string;
    allowed: boolean;
}

export interface ProtocolMessage {
    op: number;
    d?: {
        heartbeatInterval?: number;
        intents?: string[];
        code?: number;
        message?: string;
    };
}
