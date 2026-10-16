import type { CatalogEntry, DocLink } from '../types';

const CATEGORY = 'Forms & input';

const REACT_ACTIONS: DocLink = {
  label: 'useActionState',
  url: 'https://react.dev/reference/react/useActionState',
};
const REACT_FORM_STATUS: DocLink = {
  label: 'useFormStatus',
  url: 'https://react.dev/reference/react-dom/hooks/useFormStatus',
};
const RHF: DocLink = {
  label: 'React Hook Form: useForm',
  url: 'https://react-hook-form.com/docs/useform',
};
const WAI_FORM_NOTIFICATIONS: DocLink = {
  label: 'W3C WAI: User notifications in forms',
  url: 'https://www.w3.org/WAI/tutorials/forms/notifications/',
};

const LIBRARY_NOTE =
  'Large or highly dynamic forms (dozens of fields, nested arrays, schema validation with Zod/Valibot, field-level re-render isolation): use [React Hook Form](https://react-hook-form.com/), [TanStack Form](https://tanstack.com/form/latest) or [Formik](https://formik.org/docs/overview). These hooks are small and readable on purpose.';
const ACTIONS_NOTE =
  'Simple submit-and-show-result forms in React 19: `<form action={fn}>` with `useActionState` (result + pending state) and `useFormStatus` (pending state in a child button) need no custom hook, work with uncontrolled inputs and progressively enhance with Server Functions.';

export const entries: CatalogEntry[] = [
  {
    id: 'use-input',
    title: 'useInput',
    section: 'custom',
    category: CATEGORY,
    level: 'beginner',
    summary: 'One controlled text value with `bind` props, an input transform and `reset()`.',
    tags: ['controlled input', 'onChange', 'bind', 'reset', 'select', 'textarea'],
    demo: 'examples/custom-hooks/forms/UseInputDemo.tsx',
    sources: ['hooks/forms/useInput.ts'],
    tests: [
      'hooks/forms/useInput.test.tsx',
      'hooks/forms/forms.ssr.test.tsx',
      'examples/custom-hooks/forms/UseInputDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Controlling an input with a state variable',
        url: 'https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable',
      },
      {
        label: 'MDN: FormData',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/FormData',
      },
    ],
    related: ['use-field', 'use-form', 'use-latest'],
    concept:
      'Wraps `useState` for a single string value and returns `{ value, setValue, onChange, reset, bind }`, where `bind = { value, onChange }` can be spread onto an `<input>`, `<textarea>` or `<select>`.',
    problem:
      'Every controlled input repeats the same `value` / `onChange={(e) => setX(e.target.value)}` / reset plumbing; formatting (digits only, upper case) ends up duplicated across handlers.',
    whenToUse: [
      'The UI reacts to every keystroke: live previews, character counts, input masks/formatting.',
      'A handful of independent inputs that do not need validation.',
    ],
    whenNotToUse: [
      'You only need the values on submit — read them with `new FormData(event.currentTarget)` from uncontrolled inputs; no state, no re-renders.',
      'The field needs validation, touched or dirty state — use `useField` or `useForm`.',
      ACTIONS_NOTE,
    ],
    api: {
      signature:
        'function useInput(initialValue?: string, options?: { transform?: (raw: string) => string }): { value: string; setValue: (value: string) => void; onChange: (event: ChangeEvent<TextInputElement>) => void; reset: () => void; bind: { value: string; onChange: ... } }',
      params: [
        {
          name: 'initialValue',
          type: 'string',
          description: 'Default `""`. Captured on mount; `reset()` restores it.',
          optional: true,
        },
        {
          name: 'options.transform',
          type: '(raw: string) => string',
          description:
            'Applied to user input only (not to `setValue`). May change between renders.',
          optional: true,
        },
      ],
      returns:
        '`value`, `setValue`, `onChange`, `reset` (all stable) and `bind`, which changes only when the value does.',
    },
    execution: [
      'Render: returns the current value and a memoised `bind` object.',
      '`onChange` reads `event.target.value`, applies the latest `transform` (kept in `useLatest`) and sets state.',
      'No effects, no subscriptions — nothing to clean up.',
    ],
    mistakes: [
      {
        title: 'Transforming in render instead of on input',
        wrong:
          '<input value={value.replace(/\\D/g, "")} onChange={(e) => setValue(e.target.value)} />',
        why: 'State and the displayed value disagree, so the caret jumps and the "real" value still contains the characters you hid.',
        right:
          "const phone = useInput('', { transform: (raw) => raw.replace(/\\D/g, '') });\n<input {...phone.bind} />",
      },
      {
        title: 'Switching between controlled and uncontrolled',
        wrong: '<input value={user?.name} onChange={onChange} />',
        why: '`undefined` makes the input uncontrolled; when it later becomes a string React warns and ignores the switch. Always pass a string.',
      },
    ],
    edgeCases: [
      'An input transform that changes the value moves the caret to the end in some browsers; keep transforms simple (filtering) or manage the selection yourself.',
      '`<select multiple>` and checkboxes are not strings — use `useForm` (booleans) or plain state.',
    ],
    testing:
      'User-event tests type into a bound input, verify the transform and reset; a `renderHook` test checks that callbacks are stable; an SSR test renders the initial value.',
  },
  {
    id: 'use-field',
    title: 'useField',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'A validated field: value, touched, dirty, error, async checks and accessible `aria-invalid` / `aria-describedby` props.',
    tags: ['validation', 'touched', 'dirty', 'blur', 'aria-invalid', 'aria-describedby', 'useId'],
    demo: 'examples/custom-hooks/forms/UseFieldDemo.tsx',
    sources: ['hooks/forms/useField.ts', 'hooks/forms/useFormValidation.ts'],
    tests: [
      'hooks/forms/useField.test.tsx',
      'hooks/forms/forms.ssr.test.tsx',
      'examples/custom-hooks/forms/UseFieldDemo.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: 'Ids come from `useId`, so they match between server and client.',
    },
    officialDocs: [
      { label: 'useId', url: 'https://react.dev/reference/react/useId' },
      WAI_FORM_NOTIFICATIONS,
      {
        label: 'MDN: aria-invalid',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid',
      },
    ],
    related: ['use-input', 'use-form-validation', 'use-form', 'use-id'],
    concept:
      'Owns one text value plus its touched/dirty/error state and decides *when* to validate (`validateOn: "change" | "blur" | "touched"`). Validation runs through `useFormValidation`, so async validators get stale-result protection.',
    problem:
      'Showing errors at the right time is subtle: on every keystroke is noisy, only on blur leaves stale errors while fixing, and forgetting `aria-invalid`/`aria-describedby` leaves screen-reader users without the message.',
    whenToUse: [
      'A standalone validated input: inline-edit, a search box with rules, a settings field saved on blur.',
      'Learning the building blocks before reaching for `useForm`.',
    ],
    whenNotToUse: [
      'Several fields submitted together, cross-field rules or dirty tracking — use `useForm`.',
      'Rules that the browser already enforces well (`required`, `type="email"`, `pattern`) on a simple form — the native [Constraint Validation API](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation) may be enough.',
      LIBRARY_NOTE,
    ],
    api: {
      signature:
        "function useField(options?: { initialValue?: string; validate?: Validator | Validator[]; validateAsync?: (value: string, signal: AbortSignal) => Promise<string | undefined>; asyncDebounceMs?: number; validateOn?: 'change' | 'blur' | 'touched'; id?: string }): UseFieldResult",
      params: [
        {
          name: 'validate',
          type: '(value) => string | undefined | (…)[]',
          description: 'Pure sync validators; the first message wins.',
          optional: true,
        },
        {
          name: 'validateAsync',
          type: '(value, signal) => Promise<message>',
          description: 'Runs only when sync rules pass. Pass `signal` to `fetch`.',
          optional: true,
        },
        {
          name: 'validateOn',
          type: "'change' | 'blur' | 'touched'",
          description: 'Default `touched`: first on blur, then on every change.',
          optional: true,
        },
        {
          name: 'id',
          type: 'string',
          description: 'Input id; defaults to `useId()`. The error id is `${id}-error`.',
          optional: true,
        },
      ],
      returns:
        '`value`, `setValue`, `error`, `touched`, `dirty`, `isValidating`, `validate()`, `reset()`, `errorId` and `inputProps` (`id`, `value`, `onChange`, `onBlur`, `aria-invalid`, `aria-describedby`).',
    },
    execution: [
      'Render: derives `dirty` (value ≠ initial) and builds `inputProps`; `aria-describedby` points at `errorId` only while there is an error.',
      'Change: the value is written to a ref *and* state, then validated if the mode says so (`change`, or `touched` after the first blur).',
      'Blur: marks the field touched and validates immediately (async debounce skipped).',
      'Unmount: pending async validation is aborted by `useFormValidation`.',
    ],
    mistakes: [
      {
        title: 'Error text that is not connected to the input',
        wrong: '<input aria-invalid={!!error} />\n<span className="error">{error}</span>',
        why: 'A screen reader announces "invalid" without saying why. The message must be referenced by `aria-describedby`.',
        right:
          '<input {...field.inputProps} />\n{field.error && <p id={field.errorId}>{field.error}</p>}',
      },
      {
        title: 'Validating on every keystroke from the first character',
        wrong: "useField({ validate: email, validateOn: 'change' })",
        why: 'Users see "invalid email" after typing one letter. `touched` waits for the first blur, then gives live feedback while fixing.',
      },
    ],
    edgeCases: [
      'Changing `validateOn` does not reset `touched`; remount the field (`key`) for a clean start, as the demo does.',
      '`reset()` cancels a pending async check, so a late "taken" result cannot reappear.',
    ],
    testing:
      'User-event tests cover the three timing modes (no error while first typing in `touched` mode, error on blur, live clearing), `aria-invalid` and the accessible description, async `isValidating` and reset.',
  },
  {
    id: 'use-form-validation',
    title: 'useFormValidation',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary: 'Headless sync + async validation per field with cancellation of stale async checks.',
    tags: [
      'validation',
      'async validation',
      'race condition',
      'AbortController',
      'debounce',
      'errors',
    ],
    demo: 'examples/custom-hooks/forms/UseFormValidationDemo.tsx',
    sources: ['hooks/forms/useFormValidation.ts', 'mocks/extra/forms.ts'],
    tests: [
      'hooks/forms/useFormValidation.test.tsx',
      'examples/custom-hooks/forms/UseFormValidationDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'MDN: AbortController',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
      },
      {
        label: 'Fetching data: race conditions',
        url: 'https://react.dev/reference/react/useEffect#fetching-data-with-effects',
      },
    ],
    related: ['use-field', 'use-form', 'use-latest'],
    concept:
      'Given rules `{ [field]: { validate, validateAsync, asyncDebounceMs } }`, returns an `errors` map, a `validating` map and `validateField(name, values)` / `validateAll(values)`. It stores no values, so it composes with any state (it powers `useField` and `useForm`). Pure helpers `runSyncValidators` and `validateSync` are exported too.',
    problem:
      'Async checks ("is this username free?") race: typing "ad" then "ada" sends two requests, and if the first answers last its stale "taken" overwrites the correct "available". Hand-written versions also forget to cancel requests and to skip the network when a sync rule already fails.',
    whenToUse: [
      'Server-backed rules: unique username/email, coupon codes, address lookup.',
      'Building your own form abstraction on top of a headless validator.',
    ],
    whenNotToUse: [
      'Schema validation of a whole object — use Zod/Valibot with React Hook Form or TanStack Form resolvers.',
      'Uniqueness that only matters at submit — validate on the server when submitting and map the error to the field (the sign-up demo does this for "racer").',
    ],
    api: {
      signature:
        'function useFormValidation<V extends object>(rules: { [K in keyof V]?: { validate?: SyncValidator | SyncValidator[]; validateAsync?: (value, values, signal) => Promise<string | undefined>; asyncDebounceMs?: number } }): UseFormValidationResult<V>',
      params: [
        {
          name: 'rules',
          type: 'ValidationRules<V>',
          description: 'May be an inline object; the latest rules are always used.',
        },
      ],
      returns:
        '`errors`, `validating`, `isValidating`, `validateField(name, values, { immediate?, skipAsync? })`, `validateAll(values)`, `setFieldError(name, message)` and `clearErrors(names?)`.',
    },
    execution: [
      '`validateField` aborts the field’s previous controller, records a new run, and runs sync validators — a failure stops here (no request).',
      'Otherwise it marks the field validating, waits `asyncDebounceMs` (abortable), then calls `validateAsync(value, values, signal)`.',
      'When the promise settles, the result is applied only if this run is still the latest; a superseded call resolves with the newer run’s result.',
      'Unmount aborts every pending run; results that arrive later are ignored.',
    ],
    mistakes: [
      {
        title: 'Last response wins',
        wrong:
          'onChange={async (e) => {\n  const taken = await isTaken(e.target.value);\n  setError(taken ? "Taken" : undefined);\n}}',
        why: 'Responses can arrive out of order, so an old answer overwrites the new one. Track the latest run and abort the rest.',
        right: "validation.validateField('username', { username: e.target.value });",
      },
      {
        title: 'Swallowing async validator failures',
        wrong:
          'validateAsync: async (v) => { try { return await check(v) } catch { return undefined } }',
        why: 'A network error would be reported as "valid". The hook surfaces thrown errors as the field message instead.',
      },
    ],
    edgeCases: [
      'Clearing errors (`clearErrors`) aborts that field’s pending check so a late result cannot reappear.',
      '`validateAll` runs async validators immediately (no debounce) and in parallel.',
      'A thrown non-abort error becomes the message, e.g. "Could not check availability (503)".',
    ],
    testing:
      'Deferred promises reproduce the race: the slow stale result resolves last and is ignored, and its signal is aborted. Fake timers verify the debounce; other tests cover sync short-circuiting, thrown errors, `clearErrors` and abort on unmount. The demo test drives the real MSW endpoint, whose latency is inverted to provoke the race.',
    production: [
      'Always pass `signal` to `fetch` so superseded checks stop using bandwidth.',
      'Re-check uniqueness on the server at submit time — a client-side check is only a hint.',
    ],
    diagram: {
      title: 'Stale async validation is ignored',
      description:
        'Typing "ad" then "ada": the first request is aborted and its late answer discarded.',
      mermaid: `sequenceDiagram
  participant U as User
  participant V as useFormValidation
  participant S as Server
  U->>V: validateField("ad")
  V->>S: GET ?username=ad (run 1)
  U->>V: validateField("ada")
  V-->>S: abort run 1
  V->>S: GET ?username=ada (run 2)
  S-->>V: run 2: available
  V->>U: errors.username = undefined
  S-->>V: run 1: taken (late)
  Note over V: run 1 is not current, result ignored`,
    },
  },
  {
    id: 'use-form-dirty-state',
    title: 'useFormDirtyState',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Which fields differ from their saved values, plus an optional "unsaved changes" unload warning.',
    tags: ['dirty', 'unsaved changes', 'beforeunload', 'deep equal', 'derived state'],
    demo: 'examples/custom-hooks/forms/UseFormDirtyStateDemo.tsx',
    sources: ['hooks/forms/useFormDirtyState.ts', 'hooks/browser/useEventListener.ts'],
    tests: [
      'hooks/forms/useFormDirtyState.test.tsx',
      'hooks/forms/forms.ssr.test.tsx',
      'examples/custom-hooks/forms/UseFormDirtyStateDemo.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'universal',
      notes:
        'The unload guard is a no-op on the server. Browsers show their own generic confirmation text.',
    },
    officialDocs: [
      {
        label: 'MDN: beforeunload event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event',
      },
      {
        label: 'You might not need an effect (derive state)',
        url: 'https://react.dev/learn/you-might-not-need-an-effect',
      },
    ],
    related: ['use-form', 'use-event-listener'],
    concept:
      'Compares `values` with `initialValues` field by field (structural equality by default, exported as `isStructurallyEqual`) during render and returns `isDirty`, `dirtyFields` and `isFieldDirty(name)`. With `warnOnUnload`, a `beforeunload` listener is attached only while dirty.',
    problem:
      'A `dirty` flag set in `onChange` never becomes false when the user types a change and then undoes it, and adding a permanent `beforeunload` listener disables the back/forward cache and nags users even with nothing to lose.',
    whenToUse: [
      'Settings and edit pages: enable "Save" only when something changed, show "unsaved changes", list changed fields, send a PATCH with only the dirty fields.',
    ],
    whenNotToUse: [
      'Blocking in-app navigation — use your router’s blocker (`useBlocker` in React Router, `onBeforeLeave`-style hooks elsewhere); `beforeunload` only covers reloads, tab closes and external navigation.',
      'Huge objects compared on every keystroke — pass a cheaper `isEqual` or track dirtiness per field.',
    ],
    api: {
      signature:
        'function useFormDirtyState<V extends object>(values: V, initialValues: V, options?: { isEqual?: (current, initial, name) => boolean; warnOnUnload?: boolean }): { isDirty: boolean; dirtyFields: Array<keyof V>; isFieldDirty: (name: keyof V) => boolean }',
      params: [
        { name: 'values', type: 'V', description: 'Current values.' },
        {
          name: 'initialValues',
          type: 'V',
          description: 'Baseline. After saving, pass the saved values here.',
        },
        {
          name: 'options.isEqual',
          type: '(current, initial, name) => boolean',
          description: 'Default: structural equality.',
          optional: true,
        },
        {
          name: 'options.warnOnUnload',
          type: 'boolean',
          description: 'Default `false`.',
          optional: true,
        },
      ],
      returns: '`isDirty`, `dirtyFields` (key order) and `isFieldDirty(name)`.',
    },
    execution: [
      'Render: union of keys → filter those whose values differ → `isDirty`.',
      'Effect (via `useEventListener`): adds the `beforeunload` listener when `warnOnUnload && isDirty`, removes it when either becomes false or on unmount.',
    ],
    mistakes: [
      {
        title: 'A sticky dirty flag',
        wrong:
          'const [dirty, setDirty] = useState(false);\nonChange={(e) => { setName(e.target.value); setDirty(true); }}',
        why: 'Typing "Ada" → "Adam" → "Ada" leaves the form dirty although nothing changed. Derive it by comparing values.',
        right: 'const { isDirty } = useFormDirtyState(values, saved);',
      },
      {
        title: 'A permanent beforeunload listener',
        wrong: "useEffect(() => { window.onbeforeunload = () => 'Sure?'; }, []);",
        why: 'It prompts even when nothing changed and makes the page ineligible for the back/forward cache in some browsers. Attach it only while dirty.',
      },
    ],
    edgeCases: [
      'Custom message text in the unload dialog is ignored by all modern browsers.',
      'Fields present in only one of the objects count as dirty.',
    ],
    testing:
      '`renderHook` tests verify dirty/clean transitions (including undo), structural equality, a custom `isEqual`, and that the `beforeunload` listener is added only while dirty and removed on clean/unmount (the dispatched event is `defaultPrevented`).',
  },
  {
    id: 'use-form-submission',
    title: 'useFormSubmission',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Async submit lifecycle: idle → submitting → success/error, no double submits, abort on unmount.',
    tags: ['submit', 'pending', 'double submit', 'AbortController', 'mutation', 'status'],
    demo: 'examples/custom-hooks/forms/UseFormSubmissionDemo.tsx',
    sources: ['hooks/forms/useFormSubmission.ts'],
    tests: [
      'hooks/forms/useFormSubmission.test.tsx',
      'examples/custom-hooks/forms/UseFormSubmissionDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      REACT_ACTIONS,
      REACT_FORM_STATUS,
      {
        label: 'TanStack Query: mutations',
        url: 'https://tanstack.com/query/latest/docs/framework/react/guides/mutations',
      },
    ],
    related: ['use-form', 'use-async-fn', 'use-latest'],
    concept:
      '`useFormSubmission(submitFn, { onSuccess, onError })` returns `status`, `isSubmitting`, `data`, `error`, `submit(args)`, `abort()` and `reset()`. `submitFn` receives an `AbortSignal`; `submit` never rejects and resolves with an outcome (`success`, `error`, `skipped`, `aborted`).',
    problem:
      'Disabling the button via state is too late for a fast double click (both clicks run before React re-renders), and responses arriving after the form unmounted trigger callbacks — navigation, toasts — for a form that no longer exists.',
    whenToUse: [
      'Client-side form submissions that call an API and show pending/success/error UI.',
      'Any "one at a time" async action (save, publish, pay) that needs cancellation.',
    ],
    whenNotToUse: [
      ACTIONS_NOTE,
      'Server-state mutations that should update cached queries — TanStack Query’s `useMutation` adds retries, cache invalidation and optimistic updates.',
      'Generic async functions that are not submissions (`useAsyncFn` in the async category covers those).',
    ],
    api: {
      signature:
        'function useFormSubmission<A = void, R = unknown>(submitFn: (args: A, signal: AbortSignal) => Promise<R>, options?: { onSuccess?: (data: R) => void; onError?: (error: Error) => void }): UseFormSubmissionResult<A, R>',
      params: [
        {
          name: 'submitFn',
          type: '(args, signal) => Promise<R>',
          description: 'May change between renders; the latest is called.',
        },
        {
          name: 'options.onSuccess / onError',
          type: 'callbacks',
          description: 'Not called for aborted submissions.',
          optional: true,
        },
      ],
      returns:
        '`status`, `isSubmitting`, `data`, `error`, `submit(args) → Promise<SubmissionOutcome>`, `abort()`, `reset()` (the functions are stable).',
    },
    execution: [
      '`submit`: if a ref holds an in-flight controller, resolve `{ status: "skipped" }` immediately.',
      'Otherwise create an `AbortController`, set `submitting`, await `submitFn(args, signal)`.',
      'On settle: if our signal was aborted → `aborted` (state untouched); else set `success`/`error` and call the callback.',
      'Unmount: aborts the in-flight controller.',
    ],
    mistakes: [
      {
        title: 'Guarding with state only',
        wrong: 'if (isSubmitting) return;\nsetIsSubmitting(true);\nawait save();',
        why: 'Two clicks in the same frame both read `isSubmitting === false`. A ref is updated synchronously.',
      },
      {
        title: 'Ignoring unmount',
        wrong: 'await save();\nnavigate("/done");',
        why: 'If the user left the page meanwhile, this navigates them away from wherever they are now. Abort on unmount and skip follow-up work.',
      },
    ],
    edgeCases: [
      'An `AbortError` that did not come from our signal (e.g. an inner timeout) is treated as a failure.',
      '`abort()` returns the status to `idle`; `reset()` also clears `data` and `error`.',
    ],
    testing:
      'Deferred promises step through `submitting → success`; two synchronous `submit()` calls prove only one request starts; abort and unmount tests check that the signal is aborted and callbacks are not called. The demo test uses MSW overrides for fast responses and the default slow endpoint for cancellation.',
    diagram: {
      title: 'Submission lifecycle',
      description: 'States and transitions handled by the hook.',
      mermaid: `stateDiagram-v2
  [*] --> idle
  idle --> submitting: submit()
  success --> submitting: submit()
  error --> submitting: submit()
  submitting --> submitting: submit() is skipped
  submitting --> success: resolved
  submitting --> error: rejected
  submitting --> idle: abort() or reset()
  success --> idle: reset()
  error --> idle: reset()`,
    },
  },
  {
    id: 'use-form',
    title: 'useForm',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'A small form controller: `register()`, sync + async validation, dirty state, async submit and focus on the first invalid field.',
    tags: [
      'form',
      'register',
      'validation',
      'submit',
      'focus management',
      'accessibility',
      'cross-field',
    ],
    demo: 'examples/custom-hooks/forms/UseFormDemo.tsx',
    sources: [
      'hooks/forms/useForm.ts',
      'hooks/forms/useFormValidation.ts',
      'hooks/forms/useFormDirtyState.ts',
      'hooks/forms/useFormSubmission.ts',
      'examples/custom-hooks/forms/FormRow.tsx',
      'mocks/extra/forms.ts',
    ],
    tests: [
      'hooks/forms/useForm.test.tsx',
      'hooks/forms/forms.ssr.test.tsx',
      'examples/custom-hooks/forms/UseFormDemo.test.tsx',
    ],
    minReact: '19.0', // relies on ref callbacks returning a cleanup function (React 19)
    support: { level: 'universal' },
    officialDocs: [
      RHF,
      REACT_ACTIONS,
      { label: '<form> in React', url: 'https://react.dev/reference/react-dom/components/form' },
      WAI_FORM_NOTIFICATIONS,
    ],
    related: [
      'use-form-validation',
      'use-form-dirty-state',
      'use-form-submission',
      'use-field-array',
      'use-multi-step-form',
      'use-field',
    ],
    concept:
      'Holds all values and touched state, binds native controls with `register(name)` (text-like inputs, `<select>`, `<textarea>`, checkboxes), and composes `useFormValidation`, `useFormDirtyState` and `useFormSubmission`. `handleSubmit(onSubmit)` validates everything (including async rules), moves focus to the first invalid field in DOM order, or runs `onSubmit(values, signal)`.',
    problem:
      'Forms combine many concerns — values, per-field timing of errors, cross-field rules, async checks, dirty tracking, pending/error states, double-submit protection and accessible error handling. Re-implementing them per form leads to inconsistent and inaccessible forms.',
    whenToUse: [
      'Small and medium forms (sign-up, settings, checkout steps) where a dependency-free, readable controller is preferred.',
      'Teaching or prototyping the mechanics that form libraries automate.',
    ],
    whenNotToUse: [
      LIBRARY_NOTE,
      ACTIONS_NOTE,
      'Very large forms where re-rendering on every keystroke is measurable — React Hook Form keeps inputs uncontrolled and isolates re-renders per field.',
    ],
    api: {
      signature:
        "function useForm<V extends object>(options: { initialValues: V; rules?: FormRules<V>; mode?: 'onBlur' | 'onChange' | 'onTouched'; warnOnUnsavedChanges?: boolean; focusFirstInvalid?: boolean; id?: string }): UseFormResult<V>",
      params: [
        {
          name: 'initialValues',
          type: 'V',
          description:
            'Captured on mount; use `reset(next)` to adopt saved values as the new baseline.',
        },
        {
          name: 'rules',
          type: 'FormRules<V>',
          description:
            'Per-field `validate`, `validateAsync`, `asyncDebounceMs` and `deps` (fields to re-validate when this one changes).',
          optional: true,
        },
        {
          name: 'mode',
          type: "'onBlur' | 'onChange' | 'onTouched'",
          description: 'When fields validate before submit. Default `onTouched`.',
          optional: true,
        },
        {
          name: 'warnOnUnsavedChanges',
          type: 'boolean',
          description: '`beforeunload` guard while dirty.',
          optional: true,
        },
        {
          name: 'focusFirstInvalid',
          type: 'boolean',
          description: 'Default `true`.',
          optional: true,
        },
      ],
      returns:
        '`values`, `errors`, `touched`, `validating`, `isValid`, `isDirty`, `dirtyFields`, `isSubmitting`, `submitStatus`, `submitError`, `submitCount`, `register`, `getFieldIds`, `setValue`, `setFieldError`, `focusField`, `validateFields`, `handleSubmit`, `abortSubmit`, `reset`.',
    },
    execution: [
      'Render: `register(name)` returns `id`, `name`, `value`/`checked`, handlers, a ref callback and `aria-invalid`/`aria-describedby` (→ `${id}-error`).',
      'Change: values are written to a ref and state; the field (and its `deps`) re-validate according to `mode` and touched state.',
      'Submit: prevent default → ignore if already submitting → mark all touched → `validateAll` → focus first invalid element (sorted with `compareDocumentPosition`) or `submit({ values, onSubmit })`.',
      'Unmount: pending validations and the submission are aborted by the composed hooks.',
    ],
    mistakes: [
      {
        title: 'Disabling the submit button until the form is valid',
        wrong: '<button disabled={!form.isValid}>Sign up</button>',
        why: 'Users cannot discover what is wrong, and disabled buttons are skipped by keyboard and often unexplained to screen readers. Let them submit; show errors and move focus to the first invalid field.',
        right:
          '<button type="submit">Sign up</button>  // handleSubmit focuses the first invalid field',
      },
      {
        title: 'Losing server-side field errors',
        wrong: 'catch (e) { setBanner(e.message) }',
        why: 'A 409 "username taken" belongs on the username field. Use `setFieldError` + `focusField` so it is announced in context.',
      },
    ],
    edgeCases: [
      'Inputs are not locked while submitting; the submitted values are the snapshot taken when submit started.',
      'Rules with only async validators count as valid in `isValid` until they have run.',
      'Fields that are not rendered (e.g. other wizard steps) cannot receive focus — validate per step (`validateFields`).',
    ],
    testing:
      'Integration tests render a sign-up form: validation timing (`onTouched`), `deps` re-validation, focus on the first invalid field after submit, async validation on submit, success/error submit states, the double-submit guard and reset. The demo test hits the MSW sign-up endpoint (including a 409 mapped to the field) and runs axe-core.',
    production: [
      'Keep `noValidate` on the `<form>` when you render your own messages, but still set `required`/`type` for semantics and autofill.',
      'Re-validate on the server; client validation is a UX aid, not security.',
    ],
    diagram: {
      title: 'handleSubmit',
      description: 'What happens when the user submits.',
      mermaid: `flowchart TD
  A[submit event] --> B{already submitting?}
  B -- yes --> Z[ignore]
  B -- no --> C[mark all fields touched]
  C --> D[validateAll: sync and async]
  D --> E{errors?}
  E -- yes --> F[focus first invalid field]
  E -- no --> G[onSubmit values and signal]
  G --> H{threw?}
  H -- yes --> I[submitStatus error]
  H -- no --> J[submitStatus success]`,
    },
  },
  {
    id: 'use-field-array',
    title: 'useFieldArray',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary: 'Dynamic form rows with append/remove/move/update and stable generated keys.',
    tags: ['field array', 'dynamic list', 'keys', 'reorder', 'repeatable fields'],
    demo: 'examples/custom-hooks/forms/UseFieldArrayDemo.tsx',
    sources: ['hooks/forms/useFieldArray.ts'],
    tests: [
      'hooks/forms/useFieldArray.test.tsx',
      'hooks/forms/forms.ssr.test.tsx',
      'examples/custom-hooks/forms/UseFieldArrayDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'Keeping list items in order with key',
        url: 'https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key',
      },
      {
        label: 'React Hook Form: useFieldArray',
        url: 'https://react-hook-form.com/docs/usefieldarray',
      },
    ],
    related: ['use-form', 'use-id'],
    concept:
      'Stores items as `{ key, value }` pairs. Keys are generated when an item is created and survive moves and removals of other rows; `values` gives the plain array to submit.',
    problem:
      'With `key={index}`, removing the first row makes React reuse the first row’s component for the second item: uncontrolled inputs, focus and local state appear on the wrong row. Generating keys during render (`Math.random()`) remounts every row on every render.',
    whenToUse: [
      'Repeatable groups: phone numbers, invoice lines, attendees, links, education history.',
    ],
    whenNotToUse: [
      'Items that already have a stable id from the server — use that id as the key and plain state.',
      'Field arrays that must integrate with a library’s validation/registration — use that library’s field array (e.g. React Hook Form’s `useFieldArray`).',
    ],
    api: {
      signature:
        'function useFieldArray<T>(initialValues: readonly T[] | (() => readonly T[])): { fields: ReadonlyArray<{ key: string; value: T }>; values: T[]; append; prepend; insert; remove; move; update; replace; reset }',
      params: [
        {
          name: 'initialValues',
          type: 'readonly T[] | () => readonly T[]',
          description: 'Captured on mount.',
        },
      ],
      returns:
        '`fields` (render with `key={field.key}`), `values`, and stable operations. `update(index, valueOrUpdater)` keeps the key; `replace` and `reset` assign new keys.',
    },
    execution: [
      'Mount: each initial item gets a generated key (lazy state initialiser).',
      'Operations are functional state updates, so several calls in one handler compose.',
      'Out-of-range indices are ignored and return the same array (no re-render).',
    ],
    mistakes: [
      {
        title: 'Index keys',
        wrong: 'fields.map((field, index) => <Row key={index} … />)',
        why: 'After a removal or move, rows keep the DOM and state of whatever item used to be at that index.',
        right: 'fields.map((field) => <Row key={field.key} … />)',
      },
    ],
    edgeCases: [
      'Removing the focused row removes the focused element: move focus to a neighbour or the "Add" button (the demo does) and announce the change.',
      'Keys are for React reconciliation, not DOM ids — combine with `useId` for ids.',
    ],
    testing:
      'Unit tests assert key stability through remove/move/update, clamping, ignored indices and new keys for replace/reset; a rendering test proves uncontrolled input state stays with its row. The demo test also shows the index-key bug and focus management.',
  },
  {
    id: 'use-multi-step-form',
    title: 'useMultiStepForm',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Wizard navigation: steps, progress, next/back with per-step validation and jumping to visited steps.',
    tags: ['wizard', 'stepper', 'multi-step', 'progress', 'validation', 'focus management'],
    demo: 'examples/custom-hooks/forms/UseMultiStepFormDemo.tsx',
    sources: ['hooks/forms/useMultiStepForm.ts', 'hooks/forms/useForm.ts'],
    tests: [
      'hooks/forms/useMultiStepForm.test.tsx',
      'hooks/forms/forms.ssr.test.tsx',
      'examples/custom-hooks/forms/UseMultiStepFormDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'W3C WAI: Multi-page forms',
        url: 'https://www.w3.org/WAI/tutorials/forms/multi-page/',
      },
      {
        label: 'MDN: aria-current',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current',
      },
    ],
    related: ['use-form', 'use-form-validation'],
    concept:
      'Tracks the current and furthest step. `next()` runs the current step’s `validate` (sync or async) before advancing, `back()` never validates, `goTo(index)` reaches any visited step (validating first when moving forward). Values live elsewhere — typically one `useForm` for all steps.',
    problem:
      'Wizards often keep values per step (lost when going back), validate inconsistently, allow skipping ahead to unvalidated steps, and leave focus on a button that just disappeared.',
    whenToUse: ['Long forms split into logical steps: onboarding, checkout, applications.'],
    whenNotToUse: [
      'Steps that are separate URLs — let the router own the position so back/forward and deep links work; keep only validation here.',
      'Short forms — one page with clear sections is usually easier to complete.',
    ],
    api: {
      signature:
        'function useMultiStepForm<Id extends string>(options: { steps: ReadonlyArray<{ id: Id; title: string; validate?: () => boolean | Promise<boolean> }>; initialStep?: number }): UseMultiStepFormResult<Id>',
      params: [
        {
          name: 'steps',
          type: 'FormStep[]',
          description: 'At least one. May change between renders; the index is clamped.',
        },
        { name: 'initialStep', type: 'number', description: 'Default `0`.', optional: true },
      ],
      returns:
        '`steps`, `currentIndex`, `currentStep`, `stepCount`, `isFirst`, `isLast`, `progress` (0–1), `furthestIndex`, `isValidating`, `next()`, `back()`, `goTo(index)`, `canGoTo(index)`, `reset()`.',
    },
    execution: [
      'Render: derives the clamped index, `progress` and flags.',
      '`next()`: ignored while another navigation validates; awaits `validate()`; on success updates `{ index, furthest }` (a ref mirrors it so consecutive calls compose).',
      'On the last step `next()` only validates — submit from there.',
    ],
    mistakes: [
      {
        title: 'Not moving focus on step change',
        wrong: 'onClick={() => setStep(step + 1)}',
        why: 'The focused "Next" button may stay but the content above changed silently; screen-reader users do not know a new step started. Focus the new step’s heading (tabIndex={-1}).',
      },
      {
        title: 'State per step component',
        wrong: 'function StepTwo() { const [city, setCity] = useState("") … }',
        why: 'Unmounting the step on "Back" throws its values away. Keep one form state above the steps.',
      },
    ],
    edgeCases: [
      'Validation of an earlier step can depend on later edits; the final submit should validate every field.',
      'Concurrent `next()` calls while a step validates resolve `false`.',
    ],
    testing:
      'Unit tests cover blocked/allowed `next()`, `back()` without validation, `goTo` limits, async validation with `isValidating`, ignored concurrent calls, last-step behaviour and clamping when steps shrink. The demo test walks the whole wizard, including focus moving to each step heading.',
  },
];
