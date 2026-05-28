import {
    createContext,
    useContext,
    ParentComponent,
    createSignal,
    createResource,
    Accessor,
} from 'solid-js';
import type { SessionsResponse, CursorOptions, ErrorItem } from '@lib/api';
import { useAuth } from '@lib/api';

interface SessionContextValue {
    sessions: Accessor<SessionsResponse | null | undefined>;
    refetchSessions: () => void;
    isLoading: Accessor<boolean>;
    getSessions: (cursor?: CursorOptions) => Promise<void>;
    revokeCurrentSession: () => Promise<{
        success: boolean;
        error?: ErrorItem[];
    }>;
    revokeSession: (
        id: string
    ) => Promise<{ success: boolean; error?: ErrorItem[] }>;
    revokeAllSessions: () => Promise<{ success: boolean; error?: ErrorItem[] }>;
}

const SessionContext = createContext<SessionContextValue>();

export const SessionProvider: ParentComponent = (props) => {
    const { addCsrfToken, isAuthenticated } = useAuth();

    // -------------------
    // Signals & Resources
    // -------------------
    const [isLoading, setIsLoading] = createSignal(false);
    const [cursor, setCursor] = createSignal<CursorOptions | undefined>(
        undefined
    );

    const fetchSessions = async (): Promise<SessionsResponse | null> => {
        if (!isAuthenticated()) return null;

        const params = cursor();
        const query = params
            ? '?' +
              new URLSearchParams(params as Record<string, string>).toString()
            : '';

        const res = await fetch(`/api/v1/sessions${query}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) return null;
        return res.json();
    };

    const [sessions, { refetch: refetchSessions }] =
        createResource<SessionsResponse | null>(
            () => isAuthenticated(),
            fetchSessions
        );

    // -------------------
    // Session Methods
    // -------------------
    const getSessions = async (newCursor?: CursorOptions) => {
        setCursor(newCursor);
        await refetchSessions();
    };

    const revokeCurrentSession = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/sessions/current`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...addCsrfToken(),
                },
            });
            if (res.ok) {
                await refetchSessions();
                return { success: true };
            } else {
                const error: ErrorItem[] = await res.json();
                return { success: false, error };
            }
        } catch {
            return {
                success: false,
                error: [
                    {
                        code: 'network_error',
                        description: 'Network error occurred',
                    },
                ],
            };
        } finally {
            setIsLoading(false);
        }
    };

    const revokeSession = async (id: string) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/sessions/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...addCsrfToken(),
                },
            });
            if (res.ok) {
                await refetchSessions();
                return { success: true };
            } else {
                const error: ErrorItem[] = await res.json();
                return { success: false, error };
            }
        } catch {
            return {
                success: false,
                error: [
                    {
                        code: 'network_error',
                        description: 'Network error occurred',
                    },
                ],
            };
        } finally {
            setIsLoading(false);
        }
    };

    const revokeAllSessions = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/sessions`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...addCsrfToken(),
                },
            });
            if (res.ok) {
                await refetchSessions();
                return { success: true };
            } else {
                const error: ErrorItem[] = await res.json();
                return { success: false, error };
            }
        } catch {
            return {
                success: false,
                error: [
                    {
                        code: 'network_error',
                        description: 'Network error occurred',
                    },
                ],
            };
        } finally {
            setIsLoading(false);
        }
    };

    // -------------------
    // Context Value
    // -------------------
    const value: SessionContextValue = {
        sessions,
        refetchSessions,
        isLoading,
        getSessions,
        revokeCurrentSession,
        revokeSession,
        revokeAllSessions,
    };

    return (
        <SessionContext.Provider value={value}>
            {props.children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context)
        throw new Error('useSession must be used within SessionProvider');
    return context;
};
