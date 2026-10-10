import {
    createRenderEffect,
    createResource,
    createSignal,
    Show,
    type Component,
} from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { useRootMeta } from '@lib/root';
import { groupErrors, readErrors, useAuth } from '@lib/api';
import type { ApiClient, ErrorItem, FormErrors } from '@lib/api';
import { DateHelper } from '@lib/date';
import { useI18n } from '@lib/i18n';
import { Table, Cell, Row } from '@components/Table';
import ErrorSummary from '../forms/ErrorSummary';
import FieldError, { errorId } from '../forms/FieldError';
import '@styles/forms.scss';

const FIELDS = ['name', 'expiresAt'] as const;
const inputId = (field: string) => `api-client-${field}`;
const networkError: ErrorItem[] = [
    { code: 'network_error', message: 'Network error occurred' },
];

const NoClientsPlaceholder: Component = () => <>No API clients</>;

export default function ApiClientsPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { user, isAuthenticated, addCsrfToken } = useAuth();
    const i18n = useI18n();

    createRenderEffect(() => {
        setTitle('API clients · EchoPhase');
        setDescription('Credentials for bots and scripts that call the API.');
    });

    const [clients, { refetch }] = createResource(
        isAuthenticated,
        async (): Promise<ApiClient[]> => {
            const res = await fetch('/api/v1/api-clients', {
                credentials: 'include',
            });
            return res.ok ? res.json() : [];
        }
    );

    const [name, setName] = createSignal('');
    // datetime-local value: the browser's local time, converted on submit.
    const [expiresAt, setExpiresAt] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [secret, setSecret] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);

    // Times show in the profile's zone, so they read the same on any device.
    const show = (iso: string | null) =>
        DateHelper.format(iso, user()?.timeZone, i18n.currentLocale()) || '—';

    const errorProps = (field: string) => ({
        id: inputId(field),
        name: field,
        'aria-invalid': !!errors()[field],
        'aria-describedby': errors()[field]
            ? errorId(inputId(field))
            : undefined,
    });

    async function create(e: Event) {
        e.preventDefault();
        setBusy(true);
        setSecret(null);
        try {
            const res = await fetch('/api/v1/api-clients', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...addCsrfToken(),
                },
                // The API takes moments with Z or an offset only: send UTC.
                body: JSON.stringify({
                    name: name(),
                    expiresAt: DateHelper.fromLocalInput(expiresAt()),
                }),
            });
            if (!res.ok) {
                setErrors(groupErrors(await readErrors(res), FIELDS));
                return;
            }
            const created = await res.json();
            setErrors({});
            setName('');
            setExpiresAt('');
            setSecret(created.clientSecret);
            await refetch();
        } catch {
            setErrors(groupErrors(networkError, FIELDS));
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: string) {
        setBusy(true);
        try {
            await fetch(`/api/v1/api-clients/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { ...addCsrfToken() },
            });
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div class="api-clients-container">
            <h1>API clients</h1>

            <form class="vert-form" onSubmit={create} noValidate>
                <h4 class="form-title">New client</h4>
                <ErrorSummary errors={errors()} inputId={inputId} />

                <label for={inputId('name')}>Name</label>
                <div class="form-group">
                    <input
                        {...errorProps('name')}
                        class="form-style"
                        type="text"
                        maxLength={64}
                        disabled={busy()}
                        value={name()}
                        onInput={(e) => setName(e.currentTarget.value)}
                    />
                </div>
                <FieldError for={inputId('name')} errors={errors().name} />

                <label for={inputId('expiresAt')}>
                    Expires (optional, your local time)
                </label>
                <div class="form-group">
                    <input
                        {...errorProps('expiresAt')}
                        class="form-style"
                        type="datetime-local"
                        min={DateHelper.toLocalInput(new Date())}
                        disabled={busy()}
                        value={expiresAt()}
                        onInput={(e) => setExpiresAt(e.currentTarget.value)}
                    />
                </div>
                <FieldError
                    for={inputId('expiresAt')}
                    errors={errors().expiresAt}
                />

                <button class="btn" type="submit" disabled={busy()}>
                    Create
                </button>
            </form>

            <Show when={secret()}>
                <p class="api-client-secret" role="status">
                    Secret (shown once, copy it now): <code>{secret()}</code>
                </p>
            </Show>

            <Table
                data={clients() ?? []}
                headers={['Name', 'Expires', 'Last used', 'Created', 'Actions']}
                placeholder={NoClientsPlaceholder}
                tableProps={{ class: 'api-clients' }}
                render={({ item: client }) => (
                    <Row>
                        <Cell label="Name" text={client.Name} />
                        <Cell label="Expires" text={show(client.ExpiresAt)} />
                        <Cell
                            label="Last used"
                            text={show(client.LastUsedAt)}
                        />
                        <Cell label="Created" text={show(client.CreatedAt)} />
                        <Cell label="Actions" props={{ class: 'actions' }}>
                            <button
                                class="btn"
                                aria-label={`Delete ${client.Name}`}
                                disabled={busy()}
                                onClick={() => remove(client.Id)}
                            >
                                <AiOutlineClose />
                            </button>
                        </Cell>
                    </Row>
                )}
            />
        </div>
    );
}
