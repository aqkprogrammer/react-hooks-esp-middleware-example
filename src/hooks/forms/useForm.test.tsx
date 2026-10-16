import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useForm, type FormRules, type SubmitHandler } from './useForm';

interface SignUp {
  email: string;
  password: string;
  confirm: string;
  terms: boolean;
}

const initialValues: SignUp = { email: '', password: '', confirm: '', terms: false };

const rules: FormRules<SignUp> = {
  email: { validate: (value) => (value.includes('@') ? undefined : 'Enter a valid email') },
  password: {
    validate: (value) => (value.length >= 8 ? undefined : 'At least 8 characters'),
    deps: ['confirm'],
  },
  confirm: { validate: (value, values) => (value === values.password ? undefined : 'Mismatch') },
  terms: { validate: (value) => (value ? undefined : 'Accept the terms') },
};

function SignUpForm({
  onSubmit,
  formRules = rules,
}: {
  onSubmit: SubmitHandler<SignUp>;
  formRules?: FormRules<SignUp>;
}) {
  const form = useForm<SignUp>({ initialValues, rules: formRules });
  const field = (name: 'email' | 'password' | 'confirm', label: string) => {
    const { id, errorId } = form.getFieldIds(name);
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input {...form.register(name)} />
        {form.errors[name] ? <p id={errorId}>{form.errors[name]}</p> : null}
      </div>
    );
  };
  const terms = form.getFieldIds('terms');
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {field('email', 'Email')}
      {field('password', 'Password')}
      {field('confirm', 'Confirm password')}
      <input type="checkbox" {...form.register('terms')} />
      <label htmlFor={terms.id}>I accept</label>
      {form.errors.terms ? <p id={terms.errorId}>{form.errors.terms}</p> : null}
      <button type="submit">Sign up</button>
      <button type="button" onClick={() => form.reset()}>
        Reset
      </button>
      <output>
        {`status:${form.submitStatus} dirty:${form.isDirty} valid:${form.isValid} submitting:${form.isSubmitting} count:${form.submitCount}`}
      </output>
      {form.submitError ? <p role="alert">{form.submitError.message}</p> : null}
    </form>
  );
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct horse');
  await user.type(screen.getByLabelText('Confirm password'), 'correct horse');
  await user.click(screen.getByLabelText('I accept'));
}

describe('useForm', () => {
  it('validates on blur first, then on every change (onTouched)', async () => {
    const user = userEvent.setup();
    render(<SignUpForm onSubmit={vi.fn()} />);
    const email = screen.getByLabelText('Email');
    await user.type(email, 'ada');
    expect(screen.queryByText('Enter a valid email')).not.toBeInTheDocument();
    await user.tab();
    expect(email).toHaveAccessibleDescription('Enter a valid email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    await user.type(email, '@x.io');
    expect(screen.queryByText('Enter a valid email')).not.toBeInTheDocument();
  });

  it('re-validates dependent fields (deps) when they are touched', async () => {
    const user = userEvent.setup();
    render(<SignUpForm onSubmit={vi.fn()} />);
    await user.type(screen.getByLabelText('Password'), 'abcdefgh');
    await user.type(screen.getByLabelText('Confirm password'), 'abcdefgh');
    await user.tab();
    expect(screen.queryByText('Mismatch')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Password'), 'X');
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
  });

  it('on invalid submit: marks everything touched, focuses the first invalid field in DOM order and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SignUpForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Accept the terms')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('count:1');
  });

  it('submits valid values, tracks the submission and supports checkboxes', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<SignUpForm onSubmit={onSubmit} />);
    await fillValid(user);
    expect(screen.getByRole('status')).toHaveTextContent('dirty:true valid:true');

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('status')).toHaveTextContent('submitting:true');
    // A second click while submitting is ignored.
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      {
        email: 'ada@example.com',
        password: 'correct horse',
        confirm: 'correct horse',
        terms: true,
      },
      expect.any(AbortSignal),
    );
    act(() => finish());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('status:success'));
  });

  it('exposes submit errors thrown by onSubmit', async () => {
    const user = userEvent.setup();
    render(
      <SignUpForm
        onSubmit={async () => {
          throw new Error('Email already registered');
        }}
      />,
    );
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    expect(screen.getByRole('status')).toHaveTextContent('status:error');
  });

  it('waits for async validators on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const asyncRules: FormRules<SignUp> = {
      ...rules,
      email: {
        validateAsync: async (value) =>
          value.startsWith('taken') ? 'Already registered' : undefined,
      },
    };
    render(<SignUpForm onSubmit={onSubmit} formRules={asyncRules} />);
    await fillValid(user);
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'taken@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByText('Already registered')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('reset restores initial values and clears errors and submit state', async () => {
    const user = userEvent.setup();
    render(<SignUpForm onSubmit={vi.fn()} />);
    await user.type(screen.getByLabelText('Email'), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.queryByText('Enter a valid email')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('dirty:false');
    expect(screen.getByRole('status')).toHaveTextContent('count:0');
  });

  it('setValue, validateFields and reset(next) work programmatically', async () => {
    const { result } = renderHook(() => useForm<SignUp>({ initialValues, rules }));
    act(() => result.current.setValue('email', 'nope'));
    expect(result.current.values.email).toBe('nope');
    expect(result.current.errors.email).toBeUndefined(); // untouched

    let valid = true;
    await act(async () => {
      valid = await result.current.validateFields(['email']);
    });
    expect(valid).toBe(false);
    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.email).toBe('Enter a valid email');

    const saved = { ...initialValues, email: 'nope' };
    act(() => result.current.reset(saved));
    expect(result.current.values).toEqual(saved);
    expect(result.current.isDirty).toBe(false);
  });
});
