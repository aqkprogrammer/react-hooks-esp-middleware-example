import type { CatalogEntry, DocLink } from '../types';

const INTERACTION = 'Interaction & accessibility';
const FORMS = 'Forms';
const AUTH = 'Authentication';

const APG_COMBOBOX: DocLink = {
  label: 'WAI-ARIA APG: Combobox pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
};
const APG_COMBOBOX_LIST: DocLink = {
  label: 'APG example: Editable combobox with list autocomplete',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/',
};
const APG_LISTBOX: DocLink = {
  label: 'WAI-ARIA APG: Listbox pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
};
const APG_DIALOG: DocLink = {
  label: 'WAI-ARIA APG: Dialog (modal) pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
};
const APG_ALERTDIALOG: DocLink = {
  label: 'WAI-ARIA APG: Alert and message dialogs',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/',
};
const APG_MENU_BUTTON: DocLink = {
  label: 'WAI-ARIA APG: Menu button pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/',
};
const APG_MENU: DocLink = {
  label: 'WAI-ARIA APG: Menu and menubar pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menubar/',
};
const APG_TABS: DocLink = {
  label: 'WAI-ARIA APG: Tabs pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
};
const APG_KEYBOARD: DocLink = {
  label: 'WAI-ARIA APG: Developing a keyboard interface',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/',
};
const MDN_DIALOG: DocLink = {
  label: 'MDN: <dialog>',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog',
};
const MDN_LIVE_REGIONS: DocLink = {
  label: 'MDN: ARIA live regions',
  url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions',
};
const MDN_ACTIVEDESCENDANT: DocLink = {
  label: 'MDN: aria-activedescendant',
  url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-activedescendant',
};

export const entries: CatalogEntry[] = [
  // ---------------------------------------------------------------------
  {
    id: 'autocomplete-combobox',
    title: 'Autocomplete (APG combobox)',
    section: 'scenario',
    category: INTERACTION,
    level: 'advanced',
    summary:
      'An accessible autocomplete: APG combobox + listbox, aria-activedescendant, debounced race-safe suggestions, highlighted matches and announced result counts.',
    tags: [
      'autocomplete',
      'combobox',
      'listbox',
      'typeahead',
      'aria-activedescendant',
      'aria-autocomplete',
      'debounce',
      'race condition',
      'screen reader',
    ],
    demo: 'examples/scenarios/autocomplete/AutocompleteScenario.tsx',
    sources: [
      'examples/scenarios/autocomplete/AutocompleteScenario.tsx',
      'examples/scenarios/autocomplete/LanguageCombobox.tsx',
      'examples/scenarios/autocomplete/suggestions.ts',
      'hooks/timing/useDebounce.ts',
      'hooks/async/useAsync.ts',
      'hooks/accessibility/useAnnouncer.ts',
    ],
    tests: ['examples/scenarios/autocomplete/AutocompleteScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [APG_COMBOBOX, APG_COMBOBOX_LIST, MDN_ACTIVEDESCENDANT, MDN_LIVE_REGIONS],
    related: [
      'search-with-cancellation',
      'use-debounce',
      'use-async',
      'use-announcer',
      'use-id',
      'command-palette',
    ],
    concept:
      'The text box is an `<input role="combobox" aria-autocomplete="list">` that controls a `role="listbox"` popup (`aria-controls`, `aria-expanded`). DOM focus never leaves the input: the highlighted option is referenced with `aria-activedescendant`, so typing and arrowing work together. Suggestions come from `/api/search` through `useDebounce` + `useAsync`, and `useAnnouncer` reads the settled result count.',
    problem:
      'Most hand-rolled autocompletes are a `<div>` list under an input: screen readers never learn that suggestions appeared or which one is highlighted, arrow keys do nothing, and with inverted server latency an older response overwrites the newer suggestions.',
    whenToUse: [
      'Picking one value from a large, server-backed set (cities, users, tags, languages).',
      'Any input that suggests values while the user types.',
    ],
    whenNotToUse: [
      'A handful of static options: a native `<select>` or `<input list>` + `<datalist>` is accessible for free.',
      'Free-text search that navigates to a results page: a plain search field (see `search-with-cancellation`).',
      'Multi-select, async creation of items, virtualised lists: use a maintained library (Downshift, React Aria `useComboBox`).',
    ],
    execution: [
      'Typing updates `value` and the search term at once and sets “wants open”; `useDebounce` publishes the term 250 ms after the last keystroke.',
      '`useAsync` keys the request on the debounced term; a new term aborts the previous `fetch`, and an aborted run can never set state, so the last term always wins. `keepPreviousData` keeps the old list visible while the next one loads.',
      'The popup is open when the user wants it, the field is non-empty and there are results. The active option is stored together with the response query it belongs to, so new results reset the highlight without an effect.',
      'Keys on the input: ↓/↑ open the popup and move the highlight (wrapping), Home/End jump while an option is highlighted, ←/→ return visual focus to the text, Enter accepts, Escape closes and a second Escape clears, Alt+↓ opens without moving. Blur closes.',
      'Options call `preventDefault()` on mousedown so a click selects without blurring the input.',
      'An effect announces “N suggestions available…”, “No languages match …” or “Suggestions are unavailable.” once a request settles — never on each keystroke.',
    ],
    edgeCases: [
      '“No results”: the listbox is not shown (an empty listbox is invalid ARIA); a visible message and an announcement explain why.',
      '“error” → HTTP 503 → an error message with a working Retry (`reload()`); the failure is announced.',
      'Selecting an option searches for the selected text, so reopening shows suggestions for what is in the field.',
      'The highlighted option is scrolled into view when `scrollIntoView` exists (it does not in jsdom).',
      'Matches are highlighted against the query the *response* answered, not the newest keystroke, so highlighting never disagrees with the list.',
    ],
    testing:
      'User-event tests check every APG attribute, ↓/↑ wrapping, Home/End, ←, Enter, click-to-select keeping focus, Escape twice, blur, a single debounced request, the announcer’s polite region text, the empty and 503 + Retry states, and a stale slow response that must not replace newer suggestions. axe-core runs with the popup open.',
    production: [
      'Validate the server response shape (done in `suggestions.ts`) and cap result counts server-side.',
      'For very long lists, virtualise the options but keep `aria-setsize`/`aria-posinset` correct.',
      'Test with real screen readers: VoiceOver and NVDA differ in how they announce `aria-activedescendant` changes.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'multi-step-form-wizard',
    title: 'Multi-step form wizard',
    section: 'scenario',
    category: FORMS,
    level: 'advanced',
    summary:
      'Account → profile → review sign-up with per-step validation, a sessionStorage draft that survives reloads, focus moved to each step heading and a guarded final submit.',
    tags: [
      'wizard',
      'multi-step form',
      'stepper',
      'validation',
      'sessionStorage',
      'draft',
      'beforeunload',
      'focus management',
      '409 conflict',
    ],
    demo: 'examples/scenarios/multi-step-form/MultiStepFormScenario.tsx',
    sources: [
      'examples/scenarios/multi-step-form/MultiStepFormScenario.tsx',
      'examples/scenarios/multi-step-form/wizardModel.ts',
      'hooks/forms/useMultiStepForm.ts',
      'hooks/forms/useForm.ts',
      'hooks/forms/useFormDirtyState.ts',
      'hooks/storage/useSessionStorage.ts',
      'mocks/extra/scenariosInteraction.ts',
    ],
    tests: ['examples/scenarios/multi-step-form/MultiStepFormScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'W3C WAI tutorial: Multi-page forms',
        url: 'https://www.w3.org/WAI/tutorials/forms/multi-page/',
      },
      {
        label: 'MDN: Window.sessionStorage',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage',
      },
      {
        label: 'MDN: beforeunload event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event',
      },
    ],
    related: [
      'use-multi-step-form',
      'use-form',
      'use-form-dirty-state',
      'use-session-storage',
      'use-form-submission',
    ],
    concept:
      'One `useForm` holds every field of every step; `useMultiStepForm` only tracks *where* the user is and runs each step’s `validate` (`form.validateFields(stepFields)`) before moving forward. The draft — minus the passwords — is mirrored to `sessionStorage` with `useSessionStorage` and read back on mount, and `useFormDirtyState` against an empty form registers a `beforeunload` warning.',
    problem:
      'Wizards lose input on reload, validate fields the user has not reached yet (or none at all until the end), leave screen-reader users on a vanished “Next” button after each step, and surface server conflicts on the review page where the offending field is not even shown.',
    whenToUse: [
      'Long sign-ups, checkouts, onboarding and applications where splitting reduces load.',
      'Flows whose later steps depend on earlier answers (make `steps` conditional).',
    ],
    whenNotToUse: [
      'Short forms: one page is faster and easier to review.',
      'Very large forms with many re-renders: React Hook Form keeps inputs uncontrolled.',
      'Data that must survive closing the tab or switching devices: save drafts on the server instead.',
    ],
    execution: [
      'Mount: `useSessionStorage` reads (and validates) the draft; it seeds `useForm` initial values and `useMultiStepForm`’s `initialStep`, and a notice says passwords must be re-entered.',
      'Typing: an effect writes `{ values without passwords, step }` to sessionStorage (or removes the draft when the form is blank again).',
      'Enter or “Next” submits the form element: on a non-final step that calls `wizard.next()`, which validates the step’s fields; failure focuses the first invalid field, success moves on.',
      'After the step index changes, an effect focuses the new step’s heading (`tabIndex=-1`) — or a specific field when the move was caused by an error.',
      'Final submit: `validateSync` finds the earliest step with an error (e.g. passwords missing after a restore) and jumps there; otherwise `form.handleSubmit` posts to `/api/scenarios/wizard/accounts`.',
      'A 409 sets the server’s message on `email` and returns to step 1 with that field focused; a 500 shows an alert and the same button retries; success removes the draft and focuses the confirmation heading.',
    ],
    edgeCases: [
      'Going back never validates; visited steps can be revisited from the step list (`canGoTo`).',
      'A corrupt or outdated draft fails the `validate` guard and is ignored.',
      'Passwords are never written to Web Storage — any script on the origin can read it.',
      '`beforeunload` only warns while the form has input; it cannot block in-app route changes.',
      'Double submits are ignored by `useForm` while one is running.',
    ],
    testing:
      'User-event tests cover per-step validation and focus, Enter-as-Next, heading focus on each step, going back without losing values, the persisted draft (asserting no password in storage) and its restoration after unmount/remount, a restored draft sent back to the password step on submit, corrupt drafts, success, 409 mapping to the email field, 500 + retry, the `beforeunload` guard and axe-core.',
    production: [
      'Validate everything again on the server; client validation is a convenience.',
      'Announce step changes in the document title too (`useDocumentTitle`) for multi-page wizards.',
      'For drafts that matter, autosave to the server with a version number to avoid overwriting newer edits from another tab.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'toast-notifications',
    title: 'Toast notifications',
    section: 'scenario',
    category: INTERACTION,
    level: 'advanced',
    summary:
      'A context-based toast system with auto-dismiss that pauses on hover, focus and hidden tabs, a capped visible stack with a queue, and polite vs assertive announcements.',
    tags: [
      'toast',
      'snackbar',
      'notifications',
      'context',
      'aria-live',
      'reduced motion',
      'timers',
      'WCAG 2.2.1',
    ],
    demo: 'examples/scenarios/notifications/NotificationsScenario.tsx',
    sources: [
      'examples/scenarios/notifications/NotificationsScenario.tsx',
      'examples/scenarios/notifications/ToastProvider.tsx',
      'examples/scenarios/notifications/ToastItem.tsx',
      'examples/scenarios/notifications/toastContext.ts',
      'hooks/accessibility/useAnnouncer.ts',
      'hooks/browser/useReducedMotion.ts',
      'hooks/browser/useHover.ts',
      'hooks/browser/useFocusWithin.ts',
    ],
    tests: ['examples/scenarios/notifications/NotificationsScenario.test.tsx'],
    minReact: '19.2',
    support: {
      level: 'client-only',
      notes:
        '`useEffectEvent` (React 19.2) keeps the expiry callback fresh inside the timer effect.',
    },
    officialDocs: [
      MDN_LIVE_REGIONS,
      {
        label: 'WCAG 2.2: Understanding Timing Adjustable (2.2.1)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html',
      },
      {
        label: 'MDN: prefers-reduced-motion',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion',
      },
      {
        label: 'react.dev: useEffectEvent',
        url: 'https://react.dev/reference/react/useEffectEvent',
      },
    ],
    related: [
      'use-announcer',
      'use-reduced-motion',
      'use-hover',
      'use-focus-within',
      'use-page-visibility',
      'use-escape-key',
      'use-context',
    ],
    concept:
      '`ToastProvider` owns a queue in state and exposes `notify`/`dismiss`/`dismissAll` through context (`useToasts`). Only `maxVisible` toasts render; the rest wait. Each `ToastItem` runs its own countdown that stops — keeping the remaining time — while the stack is hovered (`useHover`), focused (`useFocusWithin`) or the tab is hidden (`usePageVisibility`). The provider announces toasts as they become visible via `useAnnouncer`: errors assertively, everything else politely.',
    problem:
      'Typical toasts vanish before slow readers, keyboard or screen-reader users can act on them, are read twice (a live-region container plus an announcement) or not at all, drop messages when too many arrive, and slide around even for users who asked the OS to reduce motion.',
    whenToUse: [
      'Short, non-blocking confirmations (“Saved”), background events and recoverable errors.',
      'App-wide feedback that has no natural place next to the control that caused it.',
    ],
    whenNotToUse: [
      'Errors the user must fix in a form: show them inline next to the field.',
      'Critical decisions: use a dialog.',
      'The only copy of important information: toasts are ephemeral — keep a notification centre or history.',
    ],
    execution: [
      '`notify()` assigns an id from a ref counter, applies defaults (errors are sticky: `duration: null`) and appends to the queue.',
      'Render: `visible = toasts.slice(0, maxVisible)`; the footer shows “N more waiting” and “Dismiss all”.',
      'Effect in the provider: newly visible ids are announced in one batch per politeness — consecutive `announce()` calls replace each other, so a burst would otherwise lose messages.',
      'Effect in each toast: while not paused, `setTimeout(remaining)`; cleanup clears it and subtracts the elapsed time, so pausing and resuming keeps the countdown honest.',
      'Dismissing a focused toast first moves focus to its neighbour (or the region) so focus is never dropped on `<body>`; Escape (via `useEscapeKey`, enabled only while focus is inside) dismisses the focused toast; Alt+T (`useKeyboardShortcut`) jumps to the stack.',
      '`useReducedMotion` swaps the slide-in for a fade and removes the shrinking countdown bar.',
    ],
    edgeCases: [
      'Changing `maxVisible` immediately reveals queued toasts; changing `defaultDuration` affects new toasts only.',
      'Toasts with actions should be sticky (WCAG 2.2.1); the demo’s error with “Retry payment” is.',
      'StrictMode runs effects twice; the announced-id set prevents double announcements.',
      'Unmounting the provider clears every timer (effect cleanups).',
    ],
    testing:
      'Fake timers with `fireEvent` (user-event would wait on faked timers) cover auto-dismiss at the exact time, sticky errors and actions, pause-and-resume with the remaining time on hover, focus and hidden tabs, the capped stack and queue, batched announcements in the polite/assertive regions, Escape and focus hand-off, Alt+T and the duration setting. Real-timer tests cover reduced motion (`installMatchMedia`), the provider guard and axe-core.',
    production: [
      'Libraries such as Sonner or React Aria’s toast cover swipe-to-dismiss, stacking animations and portals.',
      'Render the viewport near the end of `<body>` (a portal) if ancestors can create containing blocks for `position: fixed`.',
      'Rate-limit duplicate toasts (same message within a second) at the call site.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'modal-dialog',
    title: 'Modal dialog with nested confirm',
    section: 'scenario',
    category: INTERACTION,
    level: 'intermediate',
    summary:
      'An edit dialog on native <dialog>: focus moves in and back, the page is inert, Escape closes, return values report the outcome and a nested “Discard changes?” only answers the topmost Escape.',
    tags: [
      'dialog',
      'modal',
      'showModal',
      'inert',
      'focus restoration',
      'returnValue',
      'alertdialog',
      'nested dialogs',
      'scroll lock',
    ],
    demo: 'examples/scenarios/modal-dialog/ModalDialogScenario.tsx',
    sources: [
      'examples/scenarios/modal-dialog/ModalDialogScenario.tsx',
      'hooks/accessibility/useDialogState.ts',
      'hooks/forms/useForm.ts',
      'hooks/browser/useScrollLock.ts',
    ],
    tests: ['examples/scenarios/modal-dialog/ModalDialogScenario.test.tsx'],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        '`showModal()` and `inert` are supported by all evergreen browsers; jsdom lacks them, so tests use `installDialogPolyfill`.',
    },
    officialDocs: [
      APG_DIALOG,
      APG_ALERTDIALOG,
      MDN_DIALOG,
      {
        label: 'MDN: inert',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert',
      },
    ],
    related: [
      'use-dialog-state',
      'use-focus-trap',
      'use-escape-key',
      'use-scroll-lock',
      'use-form',
    ],
    concept:
      'Two `useDialogState` instances drive two sibling `<dialog>` elements. `showModal()` puts the dialog in the top layer and makes the rest of the document inert, so Tab can only reach the dialog (and browser UI) without any JavaScript trap. The edit form validates with `useForm`; Save closes with `"save"`, Cancel with `"cancel"`, Escape with `""`. With unsaved changes, Cancel or Escape opens an `alertdialog` whose `<form method="dialog">` buttons return `"keep"` or `"discard"`.',
    problem:
      '`<div>` modals need a focus trap, `aria-hidden` on the rest of the page, an Escape listener per layer, z-index management and manual focus restoration — and nested overlays still close together on one Escape.',
    whenToUse: [
      'Edit forms, confirmations and anything that must block the page until answered.',
      'Stacked confirmations (“Discard changes?”) on top of another modal.',
    ],
    whenNotToUse: [
      'Non-blocking content (help popovers, menus): use the Popover API or a disclosure.',
      'Long multi-step flows: a page is easier to navigate and link to.',
    ],
    execution: [
      '“Edit profile”: reset the form to the saved profile, clear the dialog’s `returnValue`, `open()` (which remembers the trigger and calls `showModal()`), then focus the name field.',
      'Save: `handleSubmit` validates; on success the profile is stored and `close("save")` fires `close`, which `useDialogState` turns into `isOpen=false`, focus back on the trigger and `onClose("save")`.',
      'Escape: the browser fires `cancel` on the topmost modal only. The editor’s `onCancel` calls the hook’s handler, then — if the form is dirty — prevents the close and opens the confirmation.',
      'Confirmation: initial focus lands on “Keep editing” (first in DOM order, the least destructive choice). Its `close` returns focus to the element that opened it; `"discard"` also closes the editor, whose own restoration returns focus to “Edit profile”.',
      '`useScrollLock(isOpen)` stops the page behind from scrolling — native modals do not do that.',
    ],
    edgeCases: [
      '`returnValue` persists between openings and Escape does not change it, so the scenario resets it before each `open()`; otherwise Escape would report the previous result.',
      'The confirmation is a sibling of the editor, not a descendant: each is its own top-layer entry.',
      'Chromium may ignore a second `preventDefault()` on `cancel` without user activation (close-watcher anti-abuse), so the “discard?” prompt cannot hold the user hostage.',
      'Backdrop clicks do not close the editor (`closeOnBackdropClick: false`): a stray click must not lose edits.',
    ],
    testing:
      '`installDialogPolyfill` models `showModal`/`close`/`returnValue`/Escape and `<form method="dialog">` (without restoring focus, so the tests prove the hook does). Tests cover initial focus, scroll lock, save/cancel/Escape return values, validation keeping the dialog open, focus restoration, the nested confirmation (Escape closes only the top dialog, focus returns to the field) and axe-core with both dialogs open. Background inertness and Tab containment are browser features jsdom cannot model; they are exercised in real browsers.',
    production: [
      'Keep one dialog component in your design system that wraps this pattern, including the dirty-check.',
      'Give every dialog a visible title wired to `aria-labelledby` (the hook provides `titleId`).',
      'If you must support browsers without `<dialog>` (very old Safari), use `useFocusTrap` + `inert` as a fallback.',
    ],
    diagram: {
      title: 'Dialog focus lifecycle',
      description:
        'Where focus goes as the edit dialog and its nested confirmation open and close.',
      mermaid: `sequenceDiagram
  participant T as Edit profile button
  participant E as Edit dialog
  participant C as Confirm dialog
  T->>E: open() remembers trigger, showModal()
  Note over E: page inert, focus on Name field
  E->>C: Escape with changes, cancel prevented
  Note over C: focus on Keep editing
  alt Keep editing or Escape
    C-->>E: close, focus back to Name field
  else Discard changes
    C-->>E: close discard
    E-->>T: close discard, focus restored
  end
  E-->>T: Save closes with save, focus restored`,
    },
  },

  // ---------------------------------------------------------------------
  {
    id: 'dropdown-menu-button',
    title: 'Dropdown menu (APG menu button)',
    section: 'scenario',
    category: INTERACTION,
    level: 'advanced',
    summary:
      'A menu button with actions, check items and a radio group: roving tabindex, first-letter typeahead, Escape/Tab/click-outside to close and focus returned to the button.',
    tags: [
      'menu',
      'menu button',
      'dropdown',
      'menuitemcheckbox',
      'menuitemradio',
      'roving tabindex',
      'typeahead',
      'click outside',
      'keyboard',
    ],
    demo: 'examples/scenarios/dropdown-menu/DropdownMenuScenario.tsx',
    sources: [
      'examples/scenarios/dropdown-menu/DropdownMenuScenario.tsx',
      'examples/scenarios/dropdown-menu/ViewOptionsMenu.tsx',
      'examples/scenarios/dropdown-menu/menuModel.ts',
      'hooks/accessibility/useRovingTabIndex.ts',
      'hooks/browser/useClickOutside.ts',
    ],
    tests: ['examples/scenarios/dropdown-menu/DropdownMenuScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [APG_MENU_BUTTON, APG_MENU, APG_KEYBOARD],
    related: [
      'use-roving-tab-index',
      'use-click-outside',
      'use-disclosure',
      'use-escape-key',
      'use-focus-within',
    ],
    concept:
      'A `<button aria-haspopup="menu" aria-expanded>` opens a `role="menu"` labelled by the button. Items are `menuitem`, `menuitemcheckbox` (`aria-checked`) and `menuitemradio` inside a labelled `role="group"`, separated by `role="separator"`. `useRovingTabIndex` (vertical, looping) makes the menu one tab stop and moves real DOM focus between items; the scenario adds Enter/Space activation, typeahead, Escape, Tab and `useClickOutside`.',
    problem:
      'Dropdowns built from a `<div>` list and click handlers cannot be opened or navigated from the keyboard, do not tell screen readers what they are or which options are checked, stay open when focus leaves, and drop focus on `<body>` after an action.',
    whenToUse: [
      'Application-style command menus: “View options”, “More actions”, editor toolbars.',
      'Menus that mix actions with checkable settings.',
    ],
    whenNotToUse: [
      'Site navigation drop-downs of links: use a disclosure (`useDisclosure`) — `role="menu"` changes how screen readers and keys behave.',
      'Choosing a form value: use `<select>` or a listbox/combobox.',
      'Nested submenus, menubars and positioning edge cases: React Aria or Radix UI menus.',
    ],
    execution: [
      'Button: Enter, Space or click opens with focus on the first item; ↓ opens on the first and ↑ on the last item. A click while open closes.',
      'Opening sets the roving index, then an effect focuses the item with `tabindex="0"` once the menu exists.',
      '↓/↑ wrap, Home/End jump (all from the roving hook); a printable key moves to the next item starting with that letter, wrapping.',
      'Enter activates any item and closes; Space toggles check/radio items without closing and activates actions. The disabled “Share…” item stays focusable (`aria-disabled`) but does nothing — APG recommends keeping disabled menu items focusable.',
      'Escape closes and focuses the button. Tab focuses the button *before* the browser’s default Tab runs, so focus continues to the next element; Shift+Tab lands on the button.',
      'A pointer press outside the menu and button closes it; focus returns to the button only if it was inside the menu.',
    ],
    edgeCases: [
      '`aria-controls` is set only while the menu exists, so it never references a missing id.',
      'Typing a letter with no matching item keeps focus where it is.',
      'The button is in the `useClickOutside` refs, so its own click toggles instead of racing the outside handler.',
    ],
    testing:
      'User-event tests cover the button and item roles/states, all open keys, roving tabindex values, wrapping, Home/End, repeated typeahead, Space vs Enter on check, radio and action items, a disabled item, Tab and Shift+Tab, click-outside, button toggling and axe-core with the menu open. `findByFirstLetter` has unit tests.',
    production: [
      'Position with CSS anchor positioning or Floating UI so the menu flips at viewport edges.',
      'Support multi-character typeahead (a 500 ms buffer) for long menus.',
      'Render menus in a portal when ancestors clip overflow — then add the portal to `useClickOutside` refs.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'tabs-activation',
    title: 'Tabs with automatic and manual activation',
    section: 'scenario',
    category: INTERACTION,
    level: 'intermediate',
    summary:
      'APG tabs with a switch between automatic and manual activation, arrow/Home/End keys, full tab ↔ panel labelling, and lazy panels kept alive with <Activity>.',
    tags: [
      'tabs',
      'tablist',
      'tabpanel',
      'roving tabindex',
      'Activity',
      'lazy rendering',
      'keep state',
      'keyboard',
    ],
    demo: 'examples/scenarios/tabs/TabsScenario.tsx',
    sources: [
      'examples/scenarios/tabs/TabsScenario.tsx',
      'examples/scenarios/tabs/TabPanels.tsx',
      'hooks/accessibility/useRovingTabIndex.ts',
      'hooks/timing/useInterval.ts',
    ],
    tests: ['examples/scenarios/tabs/TabsScenario.test.tsx'],
    minReact: '19.2',
    support: { level: 'universal', notes: '`<Activity>` is stable since React 19.2.' },
    officialDocs: [
      APG_TABS,
      { label: 'react.dev: <Activity>', url: 'https://react.dev/reference/react/Activity' },
      APG_KEYBOARD,
    ],
    related: ['use-roving-tab-index', 'activity', 'use-interval', 'use-id', 'use-disclosure'],
    concept:
      'A `role="tablist"` of `<button role="tab">` elements, each with `aria-selected` and `aria-controls` pointing at its `role="tabpanel"`, which is labelled back by the tab (`aria-labelledby`) and focusable (`tabIndex=0`). `useRovingTabIndex` makes the list one tab stop. In automatic mode its `onActiveChange` selects the focused tab; in manual mode arrows only move focus and the native button click (Enter/Space) selects.',
    problem:
      'Tabs built from links or divs force users to Tab through every tab, do not expose the selected state, and either remount panels on every switch (losing typed input) or render all of them up front.',
    whenToUse: [
      'Switching between sibling views of the same object (details, activity, settings).',
      'Automatic activation when panels render instantly; manual activation when showing a panel is slow (a request, a heavy render).',
    ],
    whenNotToUse: [
      'Sequential steps: use a wizard (`multi-step-form-wizard`).',
      'Navigation between pages: links with `aria-current="page"`.',
      'Content users need to compare or see together: an accordion or a single page.',
    ],
    execution: [
      'Render: every tab and every (possibly empty) panel element exists, so `aria-controls` always resolves; only the selected panel lacks `hidden`.',
      'Lazy: a panel’s content renders only after its first selection (`visited` set). From then on it sits inside `<Activity mode="visible" | "hidden">`.',
      'Hidden `<Activity>` keeps component state (the notes text, the checklist) but disconnects effects — the timer’s interval is cleared and resumes when the panel is shown again.',
      'Keys (focus on a tab): ←/→ wrap, Home/End jump; in automatic mode each move selects. Tab moves into the panel; Shift+Tab returns to the tablist.',
      'Manual mode: when focus leaves the tablist, the roving index is reset to the selected tab, so returning with Tab or Shift+Tab lands on the selected tab (APG).',
    ],
    edgeCases: [
      'Switching modes while focus is on an unselected tab does not change the selection until the next move.',
      'Effects in hidden panels do not run: anything that must keep running (uploads, sockets) belongs above the tabs.',
      'Without `<Activity>` (React < 19.2), keep panels mounted with `hidden` — state survives, but effects keep running.',
    ],
    testing:
      'User-event tests check the tab/panel wiring, roving `tabIndex` values, automatic vs manual activation with arrows, Home/End, Enter and Space, the single tab stop and return to the selected tab, lazy rendering, state kept across switches, and — with `setInterval` faked — that a hidden panel’s timer stops and resumes. axe-core runs on the whole widget.',
    production: [
      'Reflect the selected tab in the URL (`?tab=`) when it should survive reloads or be shareable.',
      'Use `aria-orientation="vertical"` and ↑/↓ for vertical tab lists (`orientation: "vertical"`).',
      'Delete-able tabs: support Delete per APG and move focus to a neighbour.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'auth-protected-ui',
    title: 'Auth-protected UI',
    section: 'scenario',
    category: AUTH,
    level: 'advanced',
    summary:
      'Sign-in with POST /api/login, a token kept in memory, /api/me with a Bearer header, protected and role-gated sections, sign-out and server-side session expiry.',
    tags: [
      'authentication',
      'login',
      'token',
      'Authorization header',
      'protected route',
      'role-based UI',
      'session expiry',
      '401',
      '403',
      'context',
    ],
    demo: 'examples/scenarios/auth-protected-ui/AuthProtectedUiScenario.tsx',
    sources: [
      'examples/scenarios/auth-protected-ui/AuthProtectedUiScenario.tsx',
      'examples/scenarios/auth-protected-ui/AuthProvider.tsx',
      'examples/scenarios/auth-protected-ui/authContext.ts',
      'examples/scenarios/auth-protected-ui/authApi.ts',
      'examples/scenarios/auth-protected-ui/Protected.tsx',
      'examples/scenarios/auth-protected-ui/SignInForm.tsx',
      'examples/scenarios/auth-protected-ui/NotesSection.tsx',
      'hooks/forms/useForm.ts',
      'hooks/async/useAsync.ts',
      'hooks/async/useAsyncFn.ts',
      'mocks/extra/scenariosInteraction.ts',
    ],
    tests: ['examples/scenarios/auth-protected-ui/AuthProtectedUiScenario.test.tsx'],
    minReact: '19.0',
    officialDocs: [
      {
        label: 'OWASP: HTML5 Security Cheat Sheet — Local Storage',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage',
      },
      {
        label: 'MDN: Authorization header',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization',
      },
      {
        label: 'MDN: Set-Cookie (HttpOnly, Secure, SameSite)',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie',
      },
      { label: 'react.dev: use', url: 'https://react.dev/reference/react/use' },
    ],
    related: ['use-context', 'use-form', 'use-async', 'use-async-fn', 'use-announcer'],
    concept:
      '`AuthProvider` keeps `{ token, user }` in React state (plus a ref mirror) — never in Web Storage. `signIn` posts credentials to `/api/login`, then loads the user and role from `/api/me` with `Authorization: Bearer <token>`. `authFetch` adds the header to every request and ends the session on a 401 for the current token. `RequireAuth` and `RequireRole` decide what to render; the server decides what is allowed.',
    problem:
      'Apps often store tokens in localStorage (readable by any injected script), trust a role the client assumed instead of the server’s answer, treat hidden buttons as access control, and leave users staring at broken data when a session expires mid-use.',
    whenToUse: [
      'SPAs that call an API with bearer tokens.',
      'Any UI that adapts to the signed-in user’s role.',
    ],
    whenNotToUse: [
      'Server-rendered apps with cookie sessions: let the framework handle auth on the server.',
      'Rolling your own identity provider: use OAuth/OIDC with a maintained client library.',
      'As security: `RequireRole` is UX only — every endpoint must authenticate and authorise.',
    ],
    execution: [
      'Sign in: `useForm` validates, `handleSubmit` calls `signIn(username, password, signal)` — unmounting aborts both requests. 401 → “Incorrect username or password.”',
      'Success: the session is set, the form unmounts and an effect moves focus to “Signed in as …”. The role comes from `/api/me`.',
      '`NotesSection` (inside `RequireAuth`) loads notes with `useAsync` keyed on the token; editors see an add form, viewers a read-only notice.',
      '“Try to add a note anyway” (viewer) really sends the POST: the server answers 403 and the UI shows it.',
      '“Expire session on the server” revokes the token in the mock. The next request gets 401 → `authFetch` clears the session, shows and assertively announces “Your session expired…”, and focus moves to the sign-in heading.',
      'Sign out clears the in-memory session; protected sections fall back to a sign-in prompt.',
    ],
    edgeCases: [
      'A late 401 from an older token does not sign out a newer session (`authFetch` compares tokens).',
      'Reloading the page signs the user out — the price of memory-only tokens (see production notes).',
      'The `/api/me` response is validated before it is trusted.',
      'Signing in again after expiry starts a fresh server session (the mock un-revokes the token on login).',
    ],
    testing:
      'User-event + MSW tests cover the signed-out prompt, validation, 401, sign-in with role and focus, the Bearer header (a pass-through MSW handler records it), no token in localStorage/sessionStorage/cookies, editor writes, viewer UI and the server’s 403, sign-out focus, server-side expiry with the announcement and re-login, and axe-core signed out and in.',
    production: [
      'Prefer an HttpOnly, Secure, SameSite refresh cookie set by the server plus a short-lived access token in memory, refreshed on load and before expiry; “remember me” just extends the refresh cookie’s lifetime on the server.',
      'Protect cookie-based endpoints against CSRF (SameSite plus a CSRF token or custom header).',
      'Refresh silently on 401 once, then sign out; queue concurrent requests during the refresh.',
      'Never log tokens; scrub them from error reports.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'form-actions-optimistic',
    title: 'Form Actions with optimistic updates',
    section: 'scenario',
    category: FORMS,
    level: 'advanced',
    summary:
      'A todo list built from React 19 primitives: <form action>, useActionState for results, useFormStatus for the pending button and useOptimistic with automatic rollback.',
    tags: [
      'form actions',
      'useActionState',
      'useFormStatus',
      'useOptimistic',
      'optimistic UI',
      'rollback',
      'transitions',
      'React 19',
    ],
    demo: 'examples/scenarios/form-actions-optimistic/FormActionsOptimisticScenario.tsx',
    sources: [
      'examples/scenarios/form-actions-optimistic/FormActionsOptimisticScenario.tsx',
      'examples/scenarios/form-actions-optimistic/OptimisticTodoList.tsx',
      'examples/scenarios/form-actions-optimistic/SubmitButton.tsx',
      'examples/scenarios/form-actions-optimistic/todosApi.ts',
      'hooks/async/useAsync.ts',
    ],
    tests: ['examples/scenarios/form-actions-optimistic/FormActionsOptimisticScenario.test.tsx'],
    minReact: '19.0',
    officialDocs: [
      { label: 'react.dev: <form>', url: 'https://react.dev/reference/react-dom/components/form' },
      {
        label: 'react.dev: useActionState',
        url: 'https://react.dev/reference/react/useActionState',
      },
      {
        label: 'react.dev: useFormStatus',
        url: 'https://react.dev/reference/react-dom/hooks/useFormStatus',
      },
      { label: 'react.dev: useOptimistic', url: 'https://react.dev/reference/react/useOptimistic' },
    ],
    related: [
      'form-actions',
      'use-action-state',
      'use-form-status',
      'use-optimistic',
      'use-optimistic-mutation',
      'optimistic-rollback',
    ],
    concept:
      '`<form action={formAction}>` calls the `useActionState` action with the form’s `FormData` inside a transition. The action adds an optimistic todo with `useOptimistic`, awaits `POST /api/todos`, commits the saved todo with `startTransition(setTodos)` and returns `{ error, draft, lastAdded }`. `SubmitButton` reads `useFormStatus()` of its parent form. When the action settles React drops the optimistic value: on success the real todo is already in state, on failure it simply disappears.',
    problem:
      'Hand-written optimistic updates need pending flags, temporary ids, manual rollback on error and care to avoid flashing duplicates — and every form re-implements “disable the button while saving”.',
    whenToUse: [
      'Small mutations where the server almost always agrees (adding, renaming, toggling).',
      'Forms that should work with progressive enhancement and React’s built-in pending state.',
    ],
    whenNotToUse: [
      'Mutations that often fail validation on the server — show a pending state instead of a lie.',
      'Shared server state used across screens: TanStack Query’s mutations with cache updates.',
      'React 18 apps: use `useOptimisticMutation` from this library instead.',
    ],
    execution: [
      'Submit: React runs `formAction(formData)` in a transition; `useFormStatus` in the button reports `pending` and the submitted `data`.',
      'Empty title → the action returns an error immediately; no request, no optimistic item.',
      '`addOptimisticTodo()` renders the placeholder (“Saving…”) at once; `isPending` sets `aria-busy` on the list.',
      'Success: `startTransition(() => setTodos(...))` — updates after `await` need their own transition to belong to the action, otherwise the real todo would render before the placeholder is removed.',
      'Failure (title contains “fail” → 500): the action returns the error and the typed text. React resets the uncontrolled form after the action, so the input’s `defaultValue={state.draft}` restores the text; the error is linked with `aria-describedby`.',
      'Action settles: the optimistic state is discarded and the list shows `todos` again — with the saved item, or without the failed one.',
    ],
    edgeCases: [
      'Actions from the same `useActionState` run one after another; the button is disabled while pending to avoid duplicate todos.',
      '`useFormStatus` only works in a component rendered *inside* the `<form>`.',
      'The optimistic item has a temporary id; never send it to the server or use it in links.',
    ],
    testing:
      'Tests leave the act() environment (an awaited act would wait for the whole action) and hold the MSW response with a manual gate to observe the optimistic item, `aria-busy` and the pending button, then release it to assert confirmation or rollback with the error and restored text. Also covered: the real “fail” rule, empty titles without a request, the load error + retry and axe-core.',
    production: [
      'Show failures where the user is looking (inline, as here) and keep the input so retry is one click.',
      'Make the POST idempotent (a client-generated id) so a retry after a timeout cannot create duplicates.',
      'With a server framework, the same action can run on the server for progressive enhancement.',
    ],
    diagram: {
      title: 'Optimistic update with an Action and rollback',
      description: 'What the user sees while the form action runs, on success and on failure.',
      mermaid: `sequenceDiagram
  participant U as User
  participant F as form action
  participant O as useOptimistic
  participant S as Server
  U->>F: submit title
  F->>O: addOptimisticTodo, Saving shown
  F->>S: POST /api/todos
  alt 201 Created
    S-->>F: saved todo
    F->>F: startTransition setTodos
    F-->>O: action settles, real item replaces placeholder
  else 500 title contains fail
    S-->>F: error
    F-->>U: return error and draft
    F-->>O: action settles, placeholder dropped
  end`,
    },
  },

  // ---------------------------------------------------------------------
  {
    id: 'command-palette',
    title: 'Command palette (⌘K / Ctrl+K)',
    section: 'scenario',
    category: INTERACTION,
    level: 'advanced',
    summary:
      'A platform-aware ⌘K / Ctrl+K palette in a native modal dialog with a grouped combobox, keyboard navigation, route and local commands, and recent commands in localStorage.',
    tags: [
      'command palette',
      'cmd+k',
      'keyboard shortcut',
      'dialog',
      'combobox',
      'listbox groups',
      'localStorage',
      'recent items',
      'hash routing',
    ],
    demo: 'examples/scenarios/command-palette/CommandPaletteScenario.tsx',
    sources: [
      'examples/scenarios/command-palette/CommandPaletteScenario.tsx',
      'examples/scenarios/command-palette/CommandPalette.tsx',
      'examples/scenarios/command-palette/commands.ts',
      'hooks/accessibility/useKeyboardShortcut.ts',
      'hooks/accessibility/useDialogState.ts',
      'hooks/storage/useLocalStorage.ts',
      'hooks/accessibility/useAnnouncer.ts',
    ],
    tests: ['examples/scenarios/command-palette/CommandPaletteScenario.test.tsx'],
    minReact: '18.0',
    officialDocs: [
      APG_COMBOBOX,
      APG_LISTBOX,
      MDN_DIALOG,
      {
        label: 'MDN: KeyboardEvent.metaKey',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey',
      },
    ],
    related: [
      'use-keyboard-shortcut',
      'use-dialog-state',
      'use-local-storage',
      'autocomplete-combobox',
      'modal-dialog',
      'use-sync-external-store',
    ],
    concept:
      '`useKeyboardShortcut("mod+k", …, { allowInInputs: true })` toggles a `<dialog>` managed by `useDialogState`. Inside, an `<input role="combobox">` filters commands into a listbox of labelled `role="group"`s (Recent, Navigation, Actions); the first match is active and ↑/↓ move `aria-activedescendant`. Running a command closes the dialog (focus returns to where it was), records its id in localStorage (`useLocalStorage`) and runs it — navigation commands set `location.hash` (e.g. `#/entry/use-debounce`), actions toggle demo settings.',
    problem:
      'Keyboard-first users want one shortcut to reach everything. Palettes built ad hoc hard-code Ctrl on macOS, swallow the shortcut in text fields, trap focus badly, forget where focus was, and are silent for screen readers.',
    whenToUse: [
      'Apps with many pages or actions (dashboards, editors, admin tools).',
      'Power-user shortcuts that complement — never replace — visible navigation.',
    ],
    whenNotToUse: [
      'Small sites: a visible menu is easier to discover.',
      'As the only way to reach a feature: shortcuts and palettes are invisible to many users.',
    ],
    execution: [
      'Shortcut: `matchesShortcut` maps `mod` to ⌘ on Apple platforms (`isApplePlatform`) and Ctrl elsewhere; the label comes from `formatShortcut`, read through `useSyncExternalStore` so server and hydration renders agree.',
      'Open: reset the query, `open()` (remembers the focused element, `showModal()`), focus the input.',
      'Render: `buildSections` scores commands (title prefix > substring > keyword; every term must match) and groups them; recent ids come first only for an empty query, and are not repeated below.',
      'The active option is stored with the query it belongs to, so typing resets it to the best match without an effect; `useAnnouncer` reports “N commands available.”',
      'Enter or click: `pushRecent` (unique, max 5), `close("run")`, then `command.run()`. Escape or a backdrop click closes; focus returns to the trigger or to the field the user was typing in.',
      'No matches: the listbox is removed, `aria-expanded` becomes false and a message explains it.',
    ],
    edgeCases: [
      'The shortcut toggles the palette closed even while typing in its own input.',
      'Corrupt localStorage (not a string array) is ignored by the `validate` guard; unknown ids are skipped.',
      'Only command ids are stored — no query text or personal data.',
      'Browsers reserve some shortcuts (Ctrl+K focuses the address bar in some); `preventDefault` stops that only while the page has focus.',
    ],
    testing:
      'Tests run with `installDialogPolyfill`: Ctrl+K vs ⌘K (by overriding `navigator.platform`), the shortcut from another text field with focus restored there, filtering and ranking, the announcement, the no-results state, ↑/↓ wrapping, Enter changing `location.hash`, local actions, recent commands in storage and in the Recent group, clearing them, corrupt storage and axe-core in both states. The scoring and recent-list helpers have unit tests.',
    production: [
      'Generate navigation commands from your route table so they never go stale.',
      'Fuzzy matching (e.g. a small library) helps with typos; keep ranking deterministic.',
      'Let users discover the shortcut: show it in the trigger button and in help.',
    ],
  },
];
