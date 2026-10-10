import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { FaRegularUser } from 'solid-icons/fa';
import { BiRegularLock } from 'solid-icons/bi';
import { AiOutlineTags } from 'solid-icons/ai';
import { groupErrors, useAuth } from '@lib/api';
import type { FormErrors, RegisterData } from '@lib/api';
import { DateHelper } from '@lib/date';
import { useI18n } from '@lib/i18n';
import ErrorSummary from './ErrorSummary';
import FieldError, { errorId } from './FieldError';
import '@styles/forms.scss';

const FIELDS = ['name', 'username', 'password'] as const;
const inputId = (field: string) => `register-${field}`;

export default function RegisterForm() {
    const [registerForm, setRegisterForm] = createSignal<RegisterData>({
        name: '',
        username: '',
        password: '',
    });

    const [errors, setErrors] = createSignal<FormErrors>({});
    const auth = useAuth();
    const navigate = useNavigate();

    const i18n = useI18n();
    const isDisabled = () => auth.isLoading() || i18n.isLoading();

    // aria wiring shared by every input: invalid state and its error list.
    const errorProps = (field: string) => ({
        id: inputId(field),
        name: field,
        'aria-invalid': !!errors()[field],
        'aria-describedby': errors()[field]
            ? errorId(inputId(field))
            : undefined,
    });

    async function handleRegister(e: Event) {
        e.preventDefault();

        // The zone is the browser's, not a field: the user can change it later.
        const result = await auth.register({
            ...registerForm(),
            timeZone: DateHelper.browserTimeZone(),
        });

        if (result.success) {
            setErrors({});
            navigate('/');
        } else {
            setErrors(groupErrors(result.error ?? [], FIELDS));
        }
    }

    return (
        <form class="vert-form" onSubmit={handleRegister} noValidate>
            <h4 class="form-title">{i18n.t('auth.signup', 'Sign Up')}</h4>

            <ErrorSummary errors={errors()} inputId={inputId} />

            <label class="visually-hidden" for={inputId('name')}>
                {i18n.t('form.fullname', 'Your Full Name')}
            </label>
            <div class="form-group">
                <FaRegularUser class="input-icon" />
                <input
                    {...errorProps('name')}
                    class="form-style"
                    type="text"
                    autocomplete="name"
                    disabled={isDisabled()}
                    placeholder={i18n.t('form.fullname', 'Your Full Name')}
                    value={registerForm().name}
                    onInput={(e) =>
                        setRegisterForm((f) => ({
                            ...f,
                            name: e.currentTarget.value,
                        }))
                    }
                />
            </div>
            <FieldError for={inputId('name')} errors={errors().name} />

            <label class="visually-hidden" for={inputId('username')}>
                {i18n.t('form.username', 'Your Username')}
            </label>
            <div class="form-group">
                <AiOutlineTags class="input-icon" />
                <input
                    {...errorProps('username')}
                    class="form-style"
                    type="text"
                    autocomplete="username"
                    disabled={isDisabled()}
                    placeholder={i18n.t('form.username', 'Your Username')}
                    value={registerForm().username}
                    onInput={(e) =>
                        setRegisterForm((f) => ({
                            ...f,
                            username: e.currentTarget.value,
                        }))
                    }
                />
            </div>
            <FieldError for={inputId('username')} errors={errors().username} />

            <label class="visually-hidden" for={inputId('password')}>
                {i18n.t('form.password', 'Your Password')}
            </label>
            <div class="form-group">
                <BiRegularLock class="input-icon" />
                <input
                    {...errorProps('password')}
                    class="form-style"
                    type="password"
                    autocomplete="new-password"
                    disabled={isDisabled()}
                    placeholder={i18n.t('form.password', 'Your Password')}
                    value={registerForm().password}
                    onInput={(e) =>
                        setRegisterForm((f) => ({
                            ...f,
                            password: e.currentTarget.value,
                        }))
                    }
                />
            </div>
            <FieldError for={inputId('password')} errors={errors().password} />

            <button
                type="submit"
                class="btn btn-form"
                disabled={isDisabled()}
                aria-busy={isDisabled()}
            >
                {isDisabled()
                    ? i18n.t('loading', 'Loading...')
                    : i18n.t('form.submit', 'SUBMIT')}
            </button>
        </form>
    );
}
