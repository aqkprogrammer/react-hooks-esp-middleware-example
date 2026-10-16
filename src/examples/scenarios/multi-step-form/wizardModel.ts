import { fetchJson, type FormRules } from '../../../hooks';

export interface WizardValues {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  bio: string;
  newsletter: boolean;
  acceptTerms: boolean;
}

export type WizardField = keyof WizardValues;
export type StepId = 'account' | 'profile' | 'review';

export interface WizardStepDefinition {
  id: StepId;
  title: string;
  /** Fields validated before leaving this step. */
  fields: readonly WizardField[];
}

export const STEPS: readonly WizardStepDefinition[] = [
  { id: 'account', title: 'Account', fields: ['email', 'password', 'confirmPassword'] },
  { id: 'profile', title: 'Profile', fields: ['displayName', 'bio', 'newsletter'] },
  { id: 'review', title: 'Review', fields: ['acceptTerms'] },
];

export const EMPTY_VALUES: WizardValues = {
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
  bio: '',
  newsletter: false,
  acceptTerms: false,
};

export const BIO_MAX = 160;

export const rules: FormRules<WizardValues> = {
  email: {
    validate: [
      (value) => (value.trim() ? null : 'Enter your email address.'),
      (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? null
          : 'Enter an email address like name@example.com.',
    ],
  },
  password: {
    validate: [
      (value) => (value ? null : 'Choose a password.'),
      (value) => (value.length >= 8 ? null : 'Use at least 8 characters.'),
      (value) => (/\d/.test(value) ? null : 'Include at least one number.'),
    ],
    deps: ['confirmPassword'],
  },
  confirmPassword: {
    validate: (value, values) =>
      !value
        ? 'Repeat the password.'
        : value === values.password
          ? null
          : 'The passwords do not match.',
  },
  displayName: {
    validate: (value) => {
      const length = value.trim().length;
      if (length === 0) return 'Enter a display name.';
      return length < 2 || length > 40 ? 'Use 2 to 40 characters.' : null;
    },
  },
  bio: {
    validate: (value) => (value.length > BIO_MAX ? `Keep it under ${BIO_MAX} characters.` : null),
  },
  acceptTerms: {
    validate: (value) => (value ? null : 'Accept the terms to create your account.'),
  },
};

// ---------------------------------------------------------------------------
// Draft persistence (sessionStorage)
// ---------------------------------------------------------------------------

export const DRAFT_KEY = 'scenario:multi-step-form:draft';

/** Passwords are deliberately left out: never persist secrets to Web Storage. */
export type DraftValues = Omit<WizardValues, 'password' | 'confirmPassword'>;

export interface WizardDraft {
  values: DraftValues;
  step: number;
}

export function isWizardDraft(value: unknown): value is WizardDraft | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const draft = value as Partial<WizardDraft>;
  const values = draft.values as Partial<DraftValues> | undefined;
  return (
    typeof draft.step === 'number' &&
    Number.isInteger(draft.step) &&
    typeof values === 'object' &&
    values !== null &&
    typeof values.email === 'string' &&
    typeof values.displayName === 'string' &&
    typeof values.bio === 'string' &&
    typeof values.newsletter === 'boolean' &&
    typeof values.acceptTerms === 'boolean'
  );
}

export function toDraft(values: WizardValues, step: number): WizardDraft {
  const { password: _password, confirmPassword: _confirm, ...rest } = values;
  return { values: rest, step };
}

export function fromDraft(draft: WizardDraft | null): WizardValues {
  return draft ? { ...EMPTY_VALUES, ...draft.values } : EMPTY_VALUES;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export interface CreatedAccount {
  id: number;
  email: string;
  displayName: string;
}

export function createAccount(values: WizardValues, signal: AbortSignal): Promise<CreatedAccount> {
  return fetchJson<CreatedAccount>('/api/scenarios/wizard/accounts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: values.email.trim(),
      password: values.password,
      displayName: values.displayName.trim(),
      bio: values.bio,
      newsletter: values.newsletter,
    }),
    signal,
    timeoutMs: 10_000,
  });
}
