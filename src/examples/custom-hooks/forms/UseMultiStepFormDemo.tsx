import { useEffect, useId, useRef, useState } from 'react';
import { Button, Callout, Panel, ValueTable, show } from '../../../components/ui';
import { useForm, useMultiStepForm, type FormRules, type FormStep } from '../../../hooks';
import { FormRow } from './FormRow';
import { emailFormat, minLength, postJson, required, usernameFormat } from './formsApi';
import './UseMultiStepFormDemo.css';

interface WizardValues {
  username: string;
  email: string;
  displayName: string;
  role: string;
  terms: boolean;
}

type StepId = 'account' | 'profile' | 'review';

const rules: FormRules<WizardValues> = {
  username: { validate: [required('Username'), usernameFormat] },
  email: { validate: [required('Email'), emailFormat] },
  displayName: { validate: [required('Display name'), minLength(2)] },
  role: { validate: required('Role') },
  terms: { validate: (value) => (value ? undefined : 'Please confirm the details') },
};

const ROLE_LABELS: Record<string, string> = {
  developer: 'Developer',
  designer: 'Designer',
  manager: 'Manager',
};

/**
 * A 3-step wizard: one useForm holds every value, useMultiStepForm decides
 * where the user is and validates each step before moving on.
 */
export default function UseMultiStepFormDemo() {
  const form = useForm<WizardValues>({
    initialValues: { username: '', email: '', displayName: '', role: '', terms: false },
    rules,
  });
  const [done, setDone] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const progressId = useId();

  const steps: ReadonlyArray<FormStep<StepId>> = [
    { id: 'account', title: 'Account', validate: () => form.validateFields(['username', 'email']) },
    {
      id: 'profile',
      title: 'Profile',
      validate: () => form.validateFields(['displayName', 'role']),
    },
    { id: 'review', title: 'Review', validate: () => form.validateFields() },
  ];
  const wizard = useMultiStepForm({ steps });

  // Move focus to the new step's heading so screen-reader and keyboard users
  // know the content changed (but not on the first render).
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus();
  }, [wizard.currentIndex]);

  const navigate = async (action: () => Promise<boolean> | void) => {
    moved.current = true;
    const result = await action();
    if (result === false) moved.current = false;
  };

  const onSubmit = form.handleSubmit(async (values, signal) => {
    const created = await postJson<{ username: string }>(
      '/api/forms/signup',
      { username: values.username, email: values.email },
      signal,
    );
    setDone(created.username);
  });

  if (done) {
    return (
      <Callout tone="success" title="All done">
        Account “{done}” created.{' '}
        <Button
          size="sm"
          onClick={() => {
            setDone(null);
            form.reset();
            wizard.reset();
          }}
        >
          Start again
        </Button>
      </Callout>
    );
  }

  const { errors } = form;
  return (
    <div className="stack">
      <nav aria-label="Sign-up steps">
        <ol className="wizard-demo-steps">
          {wizard.steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                className="btn btn-sm"
                aria-current={index === wizard.currentIndex ? 'step' : undefined}
                disabled={!wizard.canGoTo(index)}
                onClick={() => void navigate(() => wizard.goTo(index))}
              >
                {index + 1}. {step.title}
              </button>
            </li>
          ))}
        </ol>
        <label className="small muted" htmlFor={`${progressId}-progress`}>
          Step {wizard.currentIndex + 1} of {wizard.stepCount}
        </label>
        <progress
          id={`${progressId}-progress`}
          className="progress"
          value={wizard.currentIndex + 1}
          max={wizard.stepCount}
        />
      </nav>

      <Panel title={`Sign up — ${wizard.currentStep.title}`}>
        <form
          className="stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (wizard.isLast) void onSubmit();
            else void navigate(wizard.next);
          }}
        >
          <h4 ref={headingRef} tabIndex={-1} className="wizard-demo-heading">
            {wizard.currentStep.title}
          </h4>
          {wizard.currentStep.id === 'account' ? (
            <>
              <FormRow
                label="Username"
                field={form.register('username')}
                error={errors.username}
                autoComplete="username"
              />
              <FormRow
                label="Email"
                type="email"
                field={form.register('email')}
                error={errors.email}
                autoComplete="email"
              />
            </>
          ) : null}
          {wizard.currentStep.id === 'profile' ? (
            <>
              <FormRow
                label="Display name"
                field={form.register('displayName')}
                error={errors.displayName}
                autoComplete="nickname"
              />
              <div className="field">
                <label htmlFor={form.getFieldIds('role').id} className="field-label">
                  Role
                </label>
                <select {...form.register('role')}>
                  <option value="">Choose…</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="manager">Manager</option>
                </select>
                {errors.role ? (
                  <p id={form.getFieldIds('role').errorId} className="field-error">
                    {errors.role}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
          {wizard.currentStep.id === 'review' ? (
            <>
              <ValueTable
                label="Your details"
                rows={{
                  Username: form.values.username,
                  Email: form.values.email,
                  'Display name': form.values.displayName,
                  Role: ROLE_LABELS[form.values.role] ?? show(form.values.role),
                }}
              />
              <label className="row">
                <input type="checkbox" {...form.register('terms')} />
                These details are correct
              </label>
              {errors.terms ? (
                <p id={form.getFieldIds('terms').errorId} className="field-error">
                  {errors.terms}
                </p>
              ) : null}
            </>
          ) : null}
          <div className="row">
            <Button disabled={wizard.isFirst} onClick={() => void navigate(wizard.back)}>
              Back
            </Button>
            <Button type="submit" variant="primary">
              {wizard.isLast ? (form.isSubmitting ? 'Creating…' : 'Create account') : 'Next'}
            </Button>
          </div>
          <div role="alert">
            {form.submitError ? <p className="field-error">{form.submitError.message}</p> : null}
          </div>
        </form>
      </Panel>
    </div>
  );
}
