import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Callout, Panel } from '../../../components/ui';
import {
  HttpError,
  useForm,
  useFormDirtyState,
  useMultiStepForm,
  useSessionStorage,
  validateSync,
  type FormStep,
} from '../../../hooks';
import {
  BIO_MAX,
  createAccount,
  DRAFT_KEY,
  EMPTY_VALUES,
  fromDraft,
  isWizardDraft,
  rules,
  STEPS,
  toDraft,
  type CreatedAccount,
  type StepId,
  type WizardDraft,
  type WizardField,
  type WizardValues,
} from './wizardModel';
import './MultiStepFormScenario.css';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  hintId?: string;
  error: string | undefined;
  errorId: string;
  children: ReactNode;
}

function FieldShell({ label, htmlFor, hint, hintId, error, errorId, children }: FieldShellProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const joinIds = (...ids: Array<string | undefined>) => ids.filter(Boolean).join(' ') || undefined;

/**
 * Sign-up wizard (account → profile → review): one `useForm` holds every
 * value, `useMultiStepForm` owns navigation and per-step validation, the
 * draft survives reloads of this tab via `useSessionStorage` (without the
 * passwords), and `useFormDirtyState` warns before the tab is closed.
 */
export default function MultiStepFormScenario() {
  const [draft, setDraft, removeDraft] = useSessionStorage<WizardDraft | null>(DRAFT_KEY, null, {
    validate: isWizardDraft,
  });
  // Captured on mount: whether this render restored an earlier draft.
  const [restored, setRestored] = useState(() => draft !== null);
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const successTitleId = useId();

  const form = useForm<WizardValues>({ initialValues: fromDraft(draft), rules });
  const { values, errors, validateFields, focusField, setFieldError } = form;

  const steps = useMemo<ReadonlyArray<FormStep<StepId>>>(
    () =>
      STEPS.map((step) => ({
        id: step.id,
        title: step.title,
        validate: () => validateFields(step.fields),
      })),
    [validateFields],
  );
  const wizard = useMultiStepForm({ steps, initialStep: draft?.step ?? 0 });
  const { currentIndex, goTo } = wizard;

  // Closing the tab loses the session draft (and passwords are never saved).
  const { isDirty: hasInput } = useFormDirtyState(values, EMPTY_VALUES, {
    warnOnUnload: created === null,
  });

  // Persist the draft whenever the values or the step change.
  useEffect(() => {
    if (created) return;
    if (hasInput) setDraft(toDraft(values, currentIndex));
    else removeDraft();
  }, [values, currentIndex, hasInput, created, setDraft, removeDraft]);

  // Focus management: a new step's heading (or a specific field) gets focus.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusOnStepChange = useRef<WizardField | null>(null);
  const shownIndex = useRef(currentIndex);
  useEffect(() => {
    if (shownIndex.current === currentIndex) return;
    shownIndex.current = currentIndex;
    const field = focusOnStepChange.current;
    focusOnStepChange.current = null;
    if (field) focusField(field);
    else headingRef.current?.focus();
  }, [currentIndex, focusField]);

  // After a successful submit the form disappears: move focus to the result.
  const successRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (created) successRef.current?.focus();
  }, [created]);

  const step = STEPS[currentIndex] ?? STEPS[0]!;

  const jumpToStepWithError = async (field: WizardField) => {
    const index = STEPS.findIndex((candidate) => candidate.fields.includes(field));
    const target = STEPS[index];
    if (!target) return;
    if (index !== currentIndex) focusOnStepChange.current = field;
    await goTo(index);
    await validateFields(target.fields, { focusFirstInvalid: index === currentIndex });
  };

  const submitAccount = async (submitted: WizardValues, signal: AbortSignal) => {
    try {
      const account = await createAccount(submitted, signal);
      setCreated(account);
      removeDraft();
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        // The server is the authority on uniqueness: show it on the field.
        const body = error.body as { message?: string } | undefined;
        setFieldError('email', body?.message ?? 'This email is already registered.');
        focusOnStepChange.current = 'email';
        await goTo(0);
      }
      throw error;
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wizard.isLast) {
      await wizard.next();
      return;
    }
    // A restored draft has no passwords: send the user to the first step
    // with a problem instead of failing on fields that are not on screen.
    const firstInvalid = (Object.keys(validateSync(rules, values)) as WizardField[]).sort(
      (a, b) =>
        STEPS.findIndex((s) => s.fields.includes(a)) - STEPS.findIndex((s) => s.fields.includes(b)),
    )[0];
    const invalidStep = firstInvalid ? STEPS.findIndex((s) => s.fields.includes(firstInvalid)) : -1;
    if (firstInvalid && invalidStep !== currentIndex) {
      await jumpToStepWithError(firstInvalid);
      return;
    }
    await form.handleSubmit(submitAccount)();
  };

  const startOver = () => {
    removeDraft();
    form.reset(EMPTY_VALUES);
    wizard.reset();
    setCreated(null);
    setRestored(false);
  };

  if (created) {
    return (
      <div className="stack">
        <section className="panel" aria-labelledby={successTitleId}>
          <h3 id={successTitleId} ref={successRef} tabIndex={-1} className="panel-title">
            Account created
          </h3>
          <div className="panel-body">
            <p>
              Welcome, <strong>{created.displayName}</strong>! Account #{created.id} was created for{' '}
              {created.email}. The draft was removed from sessionStorage.
            </p>
            <div>
              <Button onClick={startOver}>Create another account</Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const field = (name: WizardField) => form.getFieldIds(name);
  const textField = (
    name: Exclude<WizardField, 'newsletter' | 'acceptTerms' | 'bio'>,
    label: string,
    props: { type?: string; autoComplete?: string; hint?: string } = {},
  ) => {
    const ids = field(name);
    const registered = form.register(name);
    const hintId = props.hint ? `${ids.id}-hint` : undefined;
    return (
      <FieldShell
        label={label}
        htmlFor={ids.id}
        hint={props.hint}
        hintId={hintId}
        error={errors[name]}
        errorId={ids.errorId}
      >
        <input
          {...registered}
          className="input"
          type={props.type ?? 'text'}
          autoComplete={props.autoComplete}
          aria-describedby={joinIds(hintId, registered['aria-describedby'])}
        />
      </FieldShell>
    );
  };
  const checkbox = (name: 'newsletter' | 'acceptTerms', label: ReactNode) => {
    const ids = field(name);
    return (
      <div className="field">
        <label className="row" htmlFor={ids.id}>
          <input {...form.register(name)} type="checkbox" />
          <span>{label}</span>
        </label>
        {errors[name] ? (
          <p id={ids.errorId} className="field-error">
            {errors[name]}
          </p>
        ) : null}
      </div>
    );
  };

  const bioIds = field('bio');
  const bioRegistered = form.register('bio');
  const submitError = form.submitStatus === 'error' ? form.submitError : undefined;

  return (
    <div className="stack">
      <Panel
        title="Create your account"
        description="Three steps, one form. Reload the page mid-way: the draft comes back (without the passwords). Try an email starting with “taken@” (409) or a display name containing “fail” (500)."
      >
        {restored ? (
          <Callout title="Draft restored">
            We restored what you entered earlier in this tab. Passwords are never saved — re-enter
            them on the Account step.
          </Callout>
        ) : null}

        <nav aria-label="Sign-up progress" className="stack">
          <ol className="wizard-steps">
            {STEPS.map((item, index) => {
              const current = index === currentIndex;
              const label = `${index + 1}. ${item.title}`;
              return (
                <li key={item.id}>
                  {wizard.canGoTo(index) && !current ? (
                    <button
                      type="button"
                      className="wizard-step-link"
                      onClick={() => void goTo(index)}
                    >
                      {label}
                    </button>
                  ) : (
                    <span
                      className="wizard-step-label"
                      aria-current={current ? 'step' : undefined}
                      data-reached={index <= wizard.furthestIndex || undefined}
                    >
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <progress
            className="progress"
            value={currentIndex + 1}
            max={wizard.stepCount}
            aria-label={`Step ${currentIndex + 1} of ${wizard.stepCount}`}
          />
        </nav>

        <form noValidate onSubmit={(event) => void onSubmit(event)} className="stack">
          <h3 ref={headingRef} tabIndex={-1} className="wizard-heading">
            Step {currentIndex + 1} of {wizard.stepCount}: {step.title}
          </h3>

          {submitError ? (
            <div role="alert" className="callout callout-danger">
              Could not create the account: {submitError.message}
            </div>
          ) : null}

          {step.id === 'account' ? (
            <div className="stack">
              {textField('email', 'Email', { type: 'email', autoComplete: 'email' })}
              {textField('password', 'Password', {
                type: 'password',
                autoComplete: 'new-password',
                hint: 'At least 8 characters, including a number.',
              })}
              {textField('confirmPassword', 'Confirm password', {
                type: 'password',
                autoComplete: 'new-password',
              })}
            </div>
          ) : null}

          {step.id === 'profile' ? (
            <div className="stack">
              {textField('displayName', 'Display name', { autoComplete: 'nickname' })}
              <FieldShell
                label="Bio (optional)"
                htmlFor={bioIds.id}
                hint={`${values.bio.length}/${BIO_MAX} characters`}
                hintId={`${bioIds.id}-hint`}
                error={errors.bio}
                errorId={bioIds.errorId}
              >
                <textarea
                  {...bioRegistered}
                  className="input"
                  rows={3}
                  aria-describedby={joinIds(`${bioIds.id}-hint`, bioRegistered['aria-describedby'])}
                />
              </FieldShell>
              {checkbox('newsletter', 'Send me the monthly newsletter')}
            </div>
          ) : null}

          {step.id === 'review' ? (
            <div className="stack">
              <dl className="wizard-summary">
                <div>
                  <dt>Email</dt>
                  <dd>{values.email || '—'}</dd>
                </div>
                <div>
                  <dt>Password</dt>
                  <dd>{values.password ? 'Set' : 'Not set'}</dd>
                </div>
                <div>
                  <dt>Display name</dt>
                  <dd>{values.displayName || '—'}</dd>
                </div>
                <div>
                  <dt>Bio</dt>
                  <dd>{values.bio || '—'}</dd>
                </div>
                <div>
                  <dt>Newsletter</dt>
                  <dd>{values.newsletter ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
              {checkbox('acceptTerms', 'I accept the terms of service')}
            </div>
          ) : null}

          <div className="spread">
            <Button onClick={wizard.back} disabled={wizard.isFirst || form.isSubmitting}>
              Back
            </Button>
            <div className="row">
              {wizard.isLast ? (
                <Button type="submit" variant="primary" disabled={form.isSubmitting}>
                  {form.isSubmitting ? 'Creating account…' : 'Create account'}
                </Button>
              ) : (
                <Button type="submit" variant="primary" disabled={wizard.isValidating}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </form>

        <div className="row small muted">
          <span>{hasInput ? 'Draft saved in this tab (sessionStorage).' : 'No draft yet.'}</span>
          {hasInput ? (
            <Button size="sm" variant="ghost" onClick={startOver}>
              Discard draft
            </Button>
          ) : null}
        </div>
      </Panel>
      <Callout title="Why the passwords are not in the draft">
        sessionStorage is readable by any script on the page, so an XSS bug would leak whatever is
        in it. Persist the harmless fields only; the browser’s password manager is the right place
        for credentials.
      </Callout>
    </div>
  );
}
