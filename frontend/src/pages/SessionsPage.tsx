import { createRenderEffect } from 'solid-js';
import { useRootMeta } from '@lib/root';
import { Component } from 'solid-js';
import { Table, Cell, Row } from '@components/Table';
import { useSession } from '@lib/api';
import type { Session } from '@lib/api';
import { AiOutlineClose } from 'solid-icons/ai';

const NoSessionsPlaceholder: Component = () => {
    return <>No active sessions</>;
};

const parseUserAgent = (deviceId: string): string => {
    if (!deviceId.startsWith('Mozilla')) return deviceId;
    const match = deviceId.match(/\(([^)]+)\)/);
    const browserMatch = deviceId.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    const os = match?.[1]?.split(';')[0] ?? 'Unknown OS';
    const browser = browserMatch?.[1] ?? 'Unknown Browser';
    return `${browser} on ${os}`;
};

export default function SessionsPage() {
    const { setTitle, setDescription } = useRootMeta();
    const {
        sessions,
        revokeSession,
        revokeCurrentSession,
        revokeAllSessions,
        isLoading,
    } = useSession();

    createRenderEffect(() => {
        setTitle('Sessions · EchoPhase');
        setDescription('List of current active sessions.');
    });

    const data = (): Session[] => sessions()?.Data ?? [];

    const headers = ['Device', 'Scopes', 'Intents', 'Permissions', 'Actions'];

    return (
        <div class="sessions-container">
            <div class="sessions-header">
                <h1>Active Sessions</h1>
                <button
                    class="btn"
                    disabled={isLoading() || data().length === 0}
                    onClick={revokeAllSessions}
                >
                    Revoke All
                </button>
            </div>
            <Table
                data={data()}
                headers={headers}
                placeholder={NoSessionsPlaceholder}
                tableProps={{ class: 'sessions' }}
                render={({ item: session }) => (
                    <Row>
                        <Cell
                            label="Device"
                            text={parseUserAgent(session.DeviceId)}
                            props={{ class: 'device' }}
                        />
                        <Cell
                            label="Scopes"
                            text={session.Scopes?.join(', ') || '—'}
                            props={{ class: 'scopes' }}
                        />
                        <Cell
                            label="Intents"
                            text={session.Intents?.join(', ') || '—'}
                            props={{ class: 'intents' }}
                        />
                        <Cell
                            label="Permissions"
                            text={
                                session.Permissions?.length
                                    ? session.Permissions.map(
                                          (p) =>
                                              `${p.Resource}: ${p.Permissions.join(', ')}`
                                      ).join(' | ')
                                    : '—'
                            }
                            props={{ class: 'permissions' }}
                        />
                        <Cell label="Actions" props={{ class: 'actions' }}>
                            <div>
                                <button
                                    class="btn"
                                    disabled={isLoading()}
                                    onClick={() => revokeSession(session.Id)}
                                >
                                    <AiOutlineClose />
                                </button>
                            </div>
                        </Cell>
                    </Row>
                )}
            />
        </div>
    );
}
