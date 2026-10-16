import type { CatalogEntry, DocLink } from '../types';

const CATEGORY = 'Accessibility & interaction';

const APG_DIALOG: DocLink = {
  label: 'WAI-ARIA APG: Dialog (modal) pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
};
const APG_KEYBOARD: DocLink = {
  label: 'WAI-ARIA APG: Developing a keyboard interface',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/',
};
const MDN_DIALOG: DocLink = {
  label: 'MDN: <dialog>',
  url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog',
};

export const entries: CatalogEntry[] = [
  {
    id: 'use-focus-trap',
    title: 'useFocusTrap',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Keep Tab/Shift+Tab inside a container, set initial focus and restore focus afterwards — for overlays that cannot be a native <dialog>.',
    tags: ['focus trap', 'modal', 'drawer', 'keyboard', 'Tab', 'focus restoration', 'tabbable'],
    demo: 'examples/custom-hooks/accessibility/UseFocusTrapDemo.tsx',
    sources: [
      'hooks/accessibility/useFocusTrap.ts',
      'hooks/accessibility/tabbable.ts',
      'hooks/accessibility/layerStack.ts',
    ],
    tests: [
      'hooks/accessibility/useFocusTrap.test.tsx',
      'hooks/accessibility/accessibility.ssr.test.tsx',
      'examples/custom-hooks/accessibility/UseFocusTrapDemo.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes:
        'Uses `Element.checkVisibility()` when available to skip hidden elements; falls back to `hidden`/`inert` attribute checks.',
    },
    officialDocs: [
      APG_DIALOG,
      MDN_DIALOG,
      {
        label: 'MDN: inert',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert',
      },
    ],
    related: ['use-dialog-state', 'use-escape-key', 'use-scroll-lock', 'use-click-outside'],
    concept:
      'While active, a document `keydown` listener wraps Tab from the last tabbable element to the first (and Shift+Tab the other way), and a `focusin` listener pulls focus back if it escapes. Tabbable elements (exported as `getTabbableElements`) are recomputed on every key press. On deactivation, focus returns to the element that was focused before.',
    problem:
      'A custom modal overlay built from `<div>`s lets Tab wander into the page behind it, leaves focus on `<body>` when it closes, and breaks as soon as its content changes.',
    whenToUse: [
      'Custom overlays that cannot use `<dialog>`: legacy design-system modals, full-screen mobile menus, lightboxes rendered by third-party code.',
      'Nested overlays — only the most recently activated trap reacts.',
    ],
    whenNotToUse: [
      '**Modal dialogs: prefer a native `<dialog>` opened with `showModal()`** (see `useDialogState`). The browser makes everything else inert, handles Escape, the backdrop and top-layer stacking — no JavaScript trap needed.',
      'Non-modal content (menus, popovers, inline editors) — trapping focus there is an accessibility bug; users must be able to Tab away. Use the Popover API or close on focus-out instead.',
      'A battle-tested alternative: the `focus-trap` package or React Aria’s `FocusScope`.',
    ],
    api: {
      signature:
        "function useFocusTrap(containerRef: RefObject<HTMLElement | null>, options?: { active?: boolean; initialFocus?: 'first' | 'container' | RefObject<HTMLElement | null> | false; restoreFocus?: boolean; returnFocusTo?: RefObject<HTMLElement | null> }): void",
      params: [
        {
          name: 'containerRef',
          type: 'RefObject<HTMLElement | null>',
          description: 'The element focus is kept inside.',
        },
        { name: 'options.active', type: 'boolean', description: 'Default `true`.', optional: true },
        {
          name: 'options.initialFocus',
          type: "'first' | 'container' | ref | false",
          description:
            'Default `first` (falls back to the container, which gets `tabindex="-1"` temporarily).',
          optional: true,
        },
        {
          name: 'options.restoreFocus',
          type: 'boolean',
          description: 'Default `true`.',
          optional: true,
        },
        {
          name: 'options.returnFocusTo',
          type: 'RefObject',
          description: 'Focus this instead of the previously focused element.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    execution: [
      'Effect (active): remember `document.activeElement`, push a layer, move focus inside unless it already is.',
      'Tab keydown (topmost layer only): find tabbables; at an edge (or with focus outside) `preventDefault()` and focus the other end; with no tabbables focus the container.',
      'Focusin outside the container: refocus the last focused element inside, or the first tabbable.',
      'Cleanup: remove listeners and the layer, drop the temporary tabindex, and restore focus if it is on `<body>` or still inside the container.',
    ],
    mistakes: [
      {
        title: 'Caching the tabbable list',
        wrong: 'const [first, last] = edges(container); // computed once on open',
        why: 'Content added, removed or disabled while open (validation messages, "add item") breaks the cycle. Look elements up on each key press.',
      },
      {
        title: 'Forgetting focus restoration',
        wrong: '{open && <Overlay />}  // focus falls to <body> on close',
        why: 'Keyboard and screen-reader users lose their place and must start from the top of the page.',
      },
    ],
    edgeCases: [
      'Radio groups count once (the checked radio, or the first); disabled controls, `tabindex="-1"`, `hidden` and `inert` subtrees are skipped.',
      'Positive `tabindex` values are treated like `0` — avoid them.',
      'Overlays rendered outside the container (portals to `<body>`) pull focus out; render nested overlays inside, or give them their own trap.',
      'Parent and child traps activated in the same commit register child-first; activate nested layers on user interaction.',
    ],
    testing:
      'User-event tests Tab and Shift+Tab around the edges, skip disabled buttons, include content added while active, pull escaped focus back, focus an empty container, honour `initialFocus`/`restoreFocus` options, restore focus on deactivation and let only the innermost of two nested traps act. The demo test also runs axe-core on the open drawer.',
    diagram: {
      title: 'Tab handling while the trap is active',
      description: 'Decisions made on every Tab key press.',
      mermaid: `flowchart TD
  K[Tab keydown] --> T{topmost trap?}
  T -- no --> N[ignore]
  T -- yes --> L[find tabbable elements now]
  L --> E{any?}
  E -- no --> C[preventDefault, focus container]
  E -- yes --> S{Shift held?}
  S -- yes --> F{on first or outside?}
  F -- yes --> G[preventDefault, focus last]
  F -- no --> D[browser default]
  S -- no --> H{on last or outside?}
  H -- yes --> I[preventDefault, focus first]
  H -- no --> D`,
    },
  },
  {
    id: 'use-roving-tab-index',
    title: 'useRovingTabIndex',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'WAI-ARIA roving tabindex: one Tab stop per widget, arrow keys/Home/End inside, disabled items skipped.',
    tags: [
      'roving tabindex',
      'toolbar',
      'tabs',
      'listbox',
      'arrow keys',
      'composite widget',
      'keyboard',
    ],
    demo: 'examples/custom-hooks/accessibility/UseRovingTabIndexDemo.tsx',
    sources: ['hooks/accessibility/useRovingTabIndex.ts'],
    tests: [
      'hooks/accessibility/useRovingTabIndex.test.tsx',
      'hooks/accessibility/accessibility.ssr.test.tsx',
      'examples/custom-hooks/accessibility/UseRovingTabIndexDemo.test.tsx',
    ],
    minReact: '19.0', // relies on ref callbacks returning a cleanup function (React 19)
    support: { level: 'universal' },
    officialDocs: [
      {
        label: 'WAI-ARIA APG: Managing focus with roving tabindex',
        url: 'https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex',
      },
      {
        label: 'WAI-ARIA APG: Toolbar pattern',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/',
      },
      {
        label: 'WAI-ARIA APG: Tabs pattern',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
      },
    ],
    related: ['use-keyboard-shortcut', 'use-focus-trap'],
    concept:
      'Gives the active item `tabIndex=0` and every other item `-1`, so the widget is a single Tab stop. `getItemProps(index)` adds a ref, `onKeyDown` (arrows by orientation, Home/End, optional wrap, RTL) and `onFocus` (clicking an item makes it active).',
    problem:
      'A toolbar of ten buttons costs keyboard users ten Tab presses to get past it. Composite widgets (toolbars, tab lists, listboxes, menus, grids) are expected to be one stop with arrow-key navigation inside.',
    whenToUse: [
      'Toolbars, tab lists, radio-like button groups, listboxes and menus built from buttons.',
      'Selection-follows-focus tabs (use `onActiveChange` to select).',
    ],
    whenNotToUse: [
      'Native `<input type="radio">` groups and `<select>` — the browser already provides arrow-key behaviour.',
      'Widgets where focus should stay on a container/input and items are referenced with `aria-activedescendant` (comboboxes).',
      'Full grid/tree widgets — use a library such as React Aria, which also handles typeahead and 2-D navigation.',
    ],
    api: {
      signature:
        "function useRovingTabIndex(options: { count: number; orientation?: 'horizontal' | 'vertical' | 'both'; loop?: boolean; initialIndex?: number; isDisabled?: (index: number) => boolean; dir?: 'ltr' | 'rtl'; onActiveChange?: (index: number) => void }): { activeIndex: number; setActiveIndex: (index: number, options?: { focus?: boolean }) => void; getItemProps: (index: number) => RovingItemProps }",
      params: [
        { name: 'count', type: 'number', description: 'Number of items.' },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical' | 'both'",
          description: 'Default `horizontal`.',
          optional: true,
        },
        {
          name: 'loop',
          type: 'boolean',
          description: 'Wrap at the ends. Default `true`.',
          optional: true,
        },
        {
          name: 'isDisabled',
          type: '(index) => boolean',
          description: 'Skipped by arrows, Home and End.',
          optional: true,
        },
        {
          name: 'dir',
          type: "'ltr' | 'rtl'",
          description: 'Swaps Left/Right in RTL layouts.',
          optional: true,
        },
        {
          name: 'onActiveChange',
          type: '(index) => void',
          description: 'Called when the active item changes.',
          optional: true,
        },
      ],
      returns:
        '`activeIndex` (or `-1` if all are disabled), `setActiveIndex`, `getItemProps(index)`.',
    },
    execution: [
      'Render: if the stored index is out of range or disabled, the first enabled item becomes active (derived, no effect).',
      'Keydown on an item: compute the next enabled index, `preventDefault()`, set it active and focus its element (refs registered by `getItemProps`).',
      'Modified keys (Alt/Ctrl/Meta) are left alone so browser and screen-reader shortcuts keep working.',
    ],
    mistakes: [
      {
        title: 'Every item in the Tab order',
        wrong: 'buttons.map((b) => <button tabIndex={0}>…</button>)',
        why: 'Keyboard users must Tab through every item; APG composite widgets are one Tab stop.',
      },
      {
        title: 'Forgetting the semantics',
        wrong: '<div>{items.map((item, i) => <button {...getItemProps(i)} />)}</div>',
        why: 'The hook manages focus only. Add `role="toolbar"`/`"tablist"` with a label, `aria-orientation` for vertical tab lists, and `aria-pressed`/`aria-selected` as appropriate.',
      },
    ],
    edgeCases: [
      'APG suggests keeping disabled toolbar items focusable (with `aria-disabled`) so they are discoverable — then do not report them via `isDisabled`.',
      'Text inputs inside a roving group need Left/Right for the caret; avoid them in horizontal groups.',
      'When an action disables the focused item, move focus first (the toolbar demo’s "Clear formatting").',
    ],
    testing:
      'User-event tests cover the single Tab stop and remembered position, arrows, Home/End, wrapping vs `loop: false`, vertical orientation, RTL, skipping disabled items, ignored modifier keys, click-to-activate and fallback when the active item disappears. The demo test checks a toolbar and selection-follows-focus tabs and runs axe-core.',
  },
  {
    id: 'use-keyboard-shortcut',
    title: 'useKeyboardShortcut',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Keyboard shortcuts like `mod+k` or `shift+?`: platform-aware, ignored while typing, cleaned up.',
    tags: ['hotkeys', 'shortcuts', 'keyboard', 'mod key', 'command palette', 'WCAG 2.1.4'],
    demo: 'examples/custom-hooks/accessibility/UseKeyboardShortcutDemo.tsx',
    sources: ['hooks/accessibility/useKeyboardShortcut.ts', 'hooks/browser/useEventListener.ts'],
    tests: [
      'hooks/accessibility/useKeyboardShortcut.test.tsx',
      'hooks/accessibility/accessibility.ssr.test.tsx',
      'examples/custom-hooks/accessibility/UseKeyboardShortcutDemo.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: 'Listens after hydration; `isApplePlatform()` is `false` on the server.',
    },
    officialDocs: [
      {
        label: 'MDN: KeyboardEvent.key',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key',
      },
      {
        label: 'WCAG 2.1.4: Character key shortcuts',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html',
      },
      APG_KEYBOARD,
    ],
    related: ['use-event-listener', 'use-escape-key', 'use-roving-tab-index', 'use-latest'],
    concept:
      'Parses combos (`mod+k`, `ctrl+alt+delete`, `shift+?`, `ctrl++`, aliases such as `esc`, `space`, `up`) once, listens for `keydown` (or `keyup`) on `window` or a ref, and calls the latest handler on an exact match. Also exports `parseShortcut`, `matchesShortcut`, `formatShortcut` (⌘K vs Ctrl+K labels), `isApplePlatform` and `isTypingTarget`.',
    problem:
      'Ad-hoc `keydown` handlers fire while users type in inputs, confuse Ctrl and ⌘, treat Ctrl+K as K, break on non-US layouts and on Option-modified keys on macOS, and leak listeners.',
    whenToUse: [
      'App-wide shortcuts: command palette, search focus, help overlay, navigation keys (j/k).',
    ],
    whenNotToUse: [
      'Keys that belong to a focused widget (arrows in a toolbar, Enter on a button) — handle them on the element, or use `useRovingTabIndex`.',
      'Key sequences ("g then i"), scopes and remapping UIs — a library such as `react-hotkeys-hook` or `tinykeys` covers those.',
    ],
    api: {
      signature:
        "function useKeyboardShortcut(shortcut: string | readonly string[], handler: (event: KeyboardEvent, shortcut: string) => void, options?: { enabled?: boolean; target?: EventTargetLike; eventType?: 'keydown' | 'keyup'; preventDefault?: boolean; allowInInputs?: boolean; allowRepeat?: boolean }): void",
      params: [
        {
          name: 'shortcut',
          type: 'string | string[]',
          description: 'One combo or alternatives. Typos throw (`unknown modifier`).',
        },
        {
          name: 'handler',
          type: '(event, shortcut) => void',
          description: 'Receives which alternative matched. May change every render.',
        },
        {
          name: 'options.allowInInputs',
          type: 'boolean',
          description:
            'Default `false`: ignored in text inputs, textareas, selects and contenteditable.',
          optional: true,
        },
        {
          name: 'options.preventDefault',
          type: 'boolean',
          description: 'Default `true` (e.g. stops the browser’s own Ctrl+K).',
          optional: true,
        },
        {
          name: 'options.allowRepeat',
          type: 'boolean',
          description: 'Default `false`: auto-repeat while held is ignored.',
          optional: true,
        },
        {
          name: 'options.enabled / target / eventType',
          type: 'boolean / EventTargetLike / string',
          description: 'Disable, scope to an element, or listen on keyup.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    execution: [
      'Render: combos are parsed in `useMemo` keyed by their text.',
      'Effect (`useEventListener`): one listener; on each event skip IME composition, repeats and typing targets, then match.',
      'Match: Ctrl/Meta/Alt must equal exactly; Shift too, except for symbols written without `shift` (layout-dependent). `mod` = ⌘ on Apple platforms, Ctrl elsewhere. Letters/digits fall back to `event.code`.',
      'Cleanup: the listener is removed on unmount, when disabled or when the target changes.',
    ],
    mistakes: [
      {
        title: 'Single-key shortcuts that cannot be turned off',
        wrong: "useKeyboardShortcut('j', next);",
        why: 'Speech-input users trigger them by accident (WCAG 2.1.4). Provide a setting and pass `enabled`.',
        right: "useKeyboardShortcut('j', next, { enabled: settings.singleKeyShortcuts });",
      },
      {
        title: 'Hard-coding Ctrl',
        wrong: "if (event.ctrlKey && event.key === 'k') open();",
        why: 'Mac users expect ⌘K; Ctrl+K on macOS is a text-editing shortcut. Use `mod`.',
      },
    ],
    edgeCases: [
      'Alt/Option changes `event.key` on macOS (Option+K = "˚"); letters fall back to the physical `code`.',
      '`?` without `shift` matches with or without Shift; write `shift+?` to require it.',
      'Shortcuts the browser or OS reserves (Ctrl+W, ⌘Q) cannot be overridden.',
    ],
    testing:
      'Pure tests cover parsing, platform mapping, exact modifiers, the symbol/Shift rule, the `code` fallback and formatting. User-event tests check matching alternatives, `preventDefault`, ignoring text fields and contenteditable (but not checkboxes), `allowInInputs`, repeat/IME handling, `enabled`, element scoping and cleanup.',
  },
  {
    id: 'use-escape-key',
    title: 'useEscapeKey',
    section: 'custom',
    category: CATEGORY,
    level: 'beginner',
    summary:
      'Close overlays with Escape — only the topmost layer reacts, so nested popovers close one at a time.',
    tags: ['escape', 'dismiss', 'overlay', 'popover', 'stacking', 'layers'],
    demo: 'examples/custom-hooks/accessibility/UseEscapeKeyDemo.tsx',
    sources: [
      'hooks/accessibility/useEscapeKey.ts',
      'hooks/accessibility/layerStack.ts',
      'hooks/accessibility/useKeyboardShortcut.ts',
    ],
    tests: [
      'hooks/accessibility/useEscapeKey.test.tsx',
      'hooks/accessibility/accessibility.ssr.test.tsx',
      'examples/custom-hooks/accessibility/UseEscapeKeyDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'client-only' },
    officialDocs: [
      APG_KEYBOARD,
      {
        label: 'MDN: Popover API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Popover_API',
      },
    ],
    related: ['use-keyboard-shortcut', 'use-focus-trap', 'use-dialog-state', 'use-click-outside'],
    concept:
      'A thin specialisation of `useKeyboardShortcut("escape")` (allowed while typing) plus a shared layer stack: each enabled instance registers a layer, and Escape is delivered only to the most recently enabled one.',
    problem:
      'With one Escape listener per overlay, pressing Escape in a menu inside a drawer closes both at once. Users expect Escape to peel off one layer at a time.',
    whenToUse: ['Custom popovers, menus, drawers and inline panels — especially nested ones.'],
    whenNotToUse: [
      'Native `<dialog>` (`showModal()`) and the Popover API (`popover` attribute) already close on Escape — listen for their `cancel`/`toggle` events instead.',
      'A single overlay with no nesting — `useKeyboardShortcut("escape", close)` is enough.',
    ],
    api: {
      signature:
        'function useEscapeKey(onEscape: (event: KeyboardEvent) => void, options?: { enabled?: boolean }): void',
      params: [
        {
          name: 'onEscape',
          type: '(event) => void',
          description: 'Usually closes the overlay and returns focus to its trigger.',
        },
        {
          name: 'options.enabled',
          type: 'boolean',
          description: 'Typically the open state. Default `true`.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    execution: [
      'Effect (enabled): push a layer token; cleanup removes it.',
      'Escape keydown: every instance checks whether its token is on top; only that one calls `onEscape`.',
      'Disabling the top layer makes the next one receive Escape.',
    ],
    mistakes: [
      {
        title: 'Not returning focus',
        wrong: 'useEscapeKey(() => setOpen(false));',
        why: 'The focused element inside the overlay disappears and focus falls to `<body>`. Focus the trigger as you close.',
        right:
          'useEscapeKey(() => { setOpen(false); triggerRef.current?.focus(); }, { enabled: open });',
      },
    ],
    edgeCases: [
      'Layers are ordered by when they were enabled; a parent and child enabled in the same commit register child-first.',
      'IME composition is ignored (Escape cancels the composition instead).',
    ],
    testing:
      'User-event tests open two nested layers and check that each Escape closes only the topmost one (also while typing in an input); `renderHook` tests cover `enabled`, cleanup and a disabled upper layer not blocking the one below.',
  },
  {
    id: 'use-announcer',
    title: 'useAnnouncer',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Polite or assertive screen-reader announcements through one shared, SSR-safe aria-live region.',
    tags: [
      'aria-live',
      'live region',
      'screen reader',
      'status message',
      'announcements',
      'WCAG 4.1.3',
    ],
    demo: 'examples/custom-hooks/accessibility/UseAnnouncerDemo.tsx',
    sources: ['hooks/accessibility/useAnnouncer.ts'],
    tests: [
      'hooks/accessibility/useAnnouncer.test.tsx',
      'hooks/accessibility/accessibility.ssr.test.tsx',
      'examples/custom-hooks/accessibility/UseAnnouncerDemo.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: 'Regions are created after mount; nothing is rendered on the server.',
    },
    officialDocs: [
      {
        label: 'MDN: ARIA live regions',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions',
      },
      {
        label: 'WCAG 4.1.3: Status messages',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html',
      },
    ],
    related: ['use-form-submission', 'use-disclosure'],
    concept:
      '`announce(message, { politeness, clearAfterMs })` writes into one of two visually hidden regions (`role="status"` polite, `role="alert"` assertive) shared by every component. Regions are appended to `<body>` when the first announcer mounts and removed with the last.',
    problem:
      'Live regions only work if they exist *before* their content changes, repeated identical messages are not re-announced, regions mounted per component multiply, and stale text lingers for users who browse to it later.',
    whenToUse: [
      'Results of actions that do not move focus: "Added to cart", "3 results", "Saved", "Connection lost".',
      'Background events: uploads finished, new messages arrived.',
    ],
    whenNotToUse: [
      'A message that has a natural place in the layout — render an inline `role="status"` element there instead (visible to everyone).',
      'Form errors on submit — move focus to the first invalid field (`useForm` does) rather than announcing.',
      'Anything that changes constantly (timers, progress every 100 ms) — users will hear nothing else.',
    ],
    api: {
      signature:
        "function useAnnouncer(): { announce: (message: string, options?: { politeness?: 'polite' | 'assertive'; clearAfterMs?: number }) => void; clear: () => void }",
      params: [
        {
          name: 'options.politeness',
          type: "'polite' | 'assertive'",
          description: 'Default `polite`. Reserve `assertive` for urgent errors.',
          optional: true,
        },
        {
          name: 'options.clearAfterMs',
          type: 'number',
          description: 'Default `7000`.',
          optional: true,
        },
      ],
      returns: 'Stable `announce` and `clear` functions.',
    },
    execution: [
      'Mount effect: increment a module-level subscriber count and create the two regions if needed.',
      '`announce`: empty the region, then set the text after `ANNOUNCE_DELAY_MS` (100 ms) so identical messages are re-announced; clear it after `clearAfterMs`.',
      'Unmount: when the last subscriber leaves, timers are cleared and the regions removed. Calls after that are ignored.',
    ],
    mistakes: [
      {
        title: 'Rendering the live region together with its message',
        wrong: '{saved && <div aria-live="polite">Saved</div>}',
        why: 'Most screen readers ignore live regions that appear with content already in them. The region must exist first.',
      },
      {
        title: 'Everything assertive',
        wrong: "announce('3 results', { politeness: 'assertive' })",
        why: 'Assertive messages interrupt whatever the user is listening to. Use polite for status updates.',
      },
    ],
    edgeCases: [
      'Multiple announcements within 100 ms: the last one wins (the region is reset each time).',
      'Screen readers differ; test with at least one (NVDA, JAWS, VoiceOver, TalkBack).',
    ],
    testing:
      'Fake-timer tests verify one shared pair of regions with the right attributes, the delay-then-fill-then-clear cycle, re-announcing identical text, separate assertive routing, `clear()`, and that timers and regions are removed on the last unmount.',
  },
  {
    id: 'use-disclosure',
    title: 'useDisclosure',
    section: 'custom',
    category: CATEGORY,
    level: 'beginner',
    summary:
      'Open/close state with ARIA-wired trigger and panel props (`aria-expanded`, `aria-controls`, `useId`).',
    tags: [
      'disclosure',
      'accordion',
      'show more',
      'collapse',
      'aria-expanded',
      'aria-controls',
      'useId',
    ],
    demo: 'examples/custom-hooks/accessibility/UseDisclosureDemo.tsx',
    sources: ['hooks/accessibility/useDisclosure.ts'],
    tests: [
      'hooks/accessibility/useDisclosure.test.tsx',
      'hooks/accessibility/accessibility.ssr.test.tsx',
      'examples/custom-hooks/accessibility/UseDisclosureDemo.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: '`useId` keeps ids identical between server and client.',
    },
    officialDocs: [
      {
        label: 'WAI-ARIA APG: Disclosure pattern',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
      },
      {
        label: 'WAI-ARIA APG: Accordion pattern',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/accordion/',
      },
      {
        label: 'MDN: <details>',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details',
      },
    ],
    related: ['use-toggle', 'use-id', 'use-dialog-state'],
    concept:
      'Boolean open state (controlled via `open` + `onOpenChange`, or uncontrolled with `defaultOpen`) plus `triggerProps` (`id`, `aria-expanded`, `aria-controls`, `onClick`) and `panelProps` (`id`, `hidden`).',
    problem:
      'Toggles built with a `<div onClick>` or without `aria-expanded` give screen-reader users no idea that content appeared, and hand-made ids collide between instances or differ between server and client.',
    whenToUse: [
      '"Show more", collapsible filters, accordion sections, a mobile navigation toggle.',
    ],
    whenNotToUse: [
      'Static expandable text — native `<details>`/`<summary>` works without JavaScript and supports find-in-page.',
      'Content that should be on top of the page (menus, popovers) — use the Popover API or a dialog.',
      'A plain boolean without ARIA wiring — `useToggle`/`useBoolean` are enough.',
    ],
    api: {
      signature:
        'function useDisclosure(options?: { defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; id?: string }): { isOpen: boolean; open(): void; close(): void; toggle(): void; setOpen(open: boolean): void; triggerProps: DisclosureTriggerProps; panelProps: DisclosurePanelProps }',
      params: [
        {
          name: 'defaultOpen',
          type: 'boolean',
          description: 'Uncontrolled initial state.',
          optional: true,
        },
        {
          name: 'open / onOpenChange',
          type: 'boolean / (open) => void',
          description: 'Controlled mode: the parent owns the state (e.g. single-open accordions).',
          optional: true,
        },
        {
          name: 'id',
          type: 'string',
          description: 'Base id (`${id}-trigger`, `${id}-panel`); defaults to `useId()`.',
          optional: true,
        },
      ],
      returns: 'State, stable actions and spreadable `triggerProps` / `panelProps`.',
    },
    execution: [
      'Render: resolves controlled vs uncontrolled state and builds props; nothing else.',
      'Actions call `onOpenChange` and, when uncontrolled, update internal state.',
    ],
    mistakes: [
      {
        title: 'A clickable div as trigger',
        wrong: '<div onClick={toggle}>Shipping</div>',
        why: 'Not focusable, no Enter/Space, no role. Spread `triggerProps` on a real `<button>`.',
        right: '<button type="button" {...disclosure.triggerProps}>Shipping</button>',
      },
      {
        title: 'Hiding with CSS only',
        wrong: '<div style={{ height: open ? "auto" : 0, overflow: "hidden" }}>…</div>',
        why: 'Hidden links stay focusable and readable by screen readers. The `hidden` attribute removes the panel from both.',
      },
    ],
    edgeCases: [
      'Accordion panels add `role="region"` + `aria-labelledby={triggerProps.id}` themselves; generic disclosures should not (a labelled `<div>` without a role is invalid).',
      'Controlled mode never changes on its own — if the parent ignores `onOpenChange`, the state stays put.',
    ],
    testing:
      'User-event tests toggle with click, Enter and Space and check `aria-expanded`, the `aria-controls` target and visibility; others cover unique ids, custom ids, controlled mode and the actions. The demo test (axe-core included) covers single- and multi-open accordions.',
  },
  {
    id: 'use-dialog-state',
    title: 'useDialogState',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Drive a native <dialog> as a modal: showModal/close, state synced with close/cancel events, focus restored to the trigger.',
    tags: [
      'dialog',
      'modal',
      'showModal',
      'returnValue',
      'backdrop',
      'focus restoration',
      'confirm',
    ],
    demo: 'examples/custom-hooks/accessibility/UseDialogStateDemo.tsx',
    sources: ['hooks/accessibility/useDialogState.ts'],
    tests: [
      'hooks/accessibility/useDialogState.test.tsx',
      'hooks/accessibility/accessibility.ssr.test.tsx',
      'examples/custom-hooks/accessibility/UseDialogStateDemo.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'client-only',
      notes:
        '`showModal()` is supported by all evergreen browsers; without it the dialog opens non-modally via the `open` attribute.',
    },
    officialDocs: [
      MDN_DIALOG,
      {
        label: 'MDN: HTMLDialogElement.showModal()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal',
      },
      APG_DIALOG,
    ],
    related: ['use-focus-trap', 'use-escape-key', 'use-disclosure', 'use-scroll-lock'],
    concept:
      'Keeps the `<dialog>` mounted and returns `dialogProps` (`ref`, `aria-labelledby`, `onClose`, `onCancel`, `onClick`). `open()` remembers the focused trigger and calls `showModal()`; every way of closing — `close(value)`, Escape, `<form method="dialog">` — fires the element’s `close` event, which updates `isOpen`/`returnValue` and restores focus.',
    problem:
      'Div-based modals must re-implement focus trapping, inertness of the page behind, Escape, stacking (`z-index`), a backdrop and focus restoration. Using `<dialog>` imperatively from React, on the other hand, easily lets `isOpen` drift from the element’s real state when the browser closes it.',
    whenToUse: [
      'Confirmations, forms in a modal, "are you sure?" prompts — any modal dialog.',
      'Reading which button closed the dialog through `returnValue`.',
    ],
    whenNotToUse: [
      'Non-modal overlays (menus, tooltips, popovers) — use the Popover API or a disclosure.',
      'Information that does not require interrupting the user — show it inline.',
    ],
    api: {
      signature:
        'function useDialogState(options?: { defaultOpen?: boolean; onClose?: (returnValue: string) => void; closeOnEscape?: boolean; closeOnBackdropClick?: boolean; restoreFocus?: boolean }): { isOpen: boolean; open(): void; close(returnValue?: string): void; returnValue: string | undefined; dialogProps: DialogProps; titleId: string }',
      params: [
        {
          name: 'onClose',
          type: '(returnValue) => void',
          description: 'Runs after every close, e.g. act on `"delete"`.',
          optional: true,
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          description: 'Default `true`; `false` prevents the `cancel` event.',
          optional: true,
        },
        {
          name: 'closeOnBackdropClick',
          type: 'boolean',
          description:
            'Default `false`. Clicks inside the dialog’s box (including padding) never close it.',
          optional: true,
        },
        { name: 'restoreFocus', type: 'boolean', description: 'Default `true`.', optional: true },
      ],
      returns:
        '`isOpen`, `open`, `close`, `returnValue`, `titleId` (put it on the heading) and `dialogProps`.',
    },
    execution: [
      '`open()`: store `document.activeElement`, call `showModal()` (browser moves focus inside, makes the page inert), set `isOpen`.',
      'Escape → `cancel` (prevented if `closeOnEscape` is false) → `close`; `<form method="dialog">` → `close` with the button’s value.',
      '`close` event: set `isOpen=false` and `returnValue`, focus the stored trigger if focus was lost, call `onClose`.',
      'Unmount while open: the effect cleanup restores focus to the trigger.',
    ],
    mistakes: [
      {
        title: 'Rendering the dialog conditionally with the open attribute',
        wrong: '{isOpen && <dialog open>…</dialog>}',
        why: 'The `open` attribute shows a *non-modal* dialog: no inert page, no Escape, no backdrop, no top layer. Call `showModal()`.',
      },
      {
        title: 'State that ignores browser-initiated closes',
        wrong:
          'const [open, setOpen] = useState(false);\nuseEffect(() => { open ? ref.current.showModal() : ref.current.close(); }, [open]);',
        why: 'Pressing Escape closes the element but `open` stays `true`, so the next "open" does nothing. Sync from the `close` event.',
      },
    ],
    edgeCases: [
      'Chrome lets a second Escape close the dialog even if `cancel` is prevented (anti-abuse); do not rely on blocking Escape.',
      'Initial focus goes to the first focusable element (or one with the `autofocus` attribute) — put the safe action first.',
      'Newer browsers support `closedby="any"` for light dismiss natively.',
    ],
    testing:
      'jsdom lacks `showModal`, so tests install a small polyfill (`test/installDialogPolyfill.ts`) that models open/close, Escape → `cancel` and `<form method="dialog">` — but deliberately not focus restoration, so the tests prove the hook restores focus. Covered: labelling, initial focus, `returnValue`, Escape (allowed and prevented), backdrop vs padding clicks, `defaultOpen`, unmount while open and the no-`showModal` fallback; the demo test runs axe-core on the open dialog.',
    production: [
      'Style `::backdrop` and respect `prefers-reduced-motion` for open animations (the demo does both).',
      'Lock background scrolling if your layout needs it; `showModal()` does not do that.',
    ],
    diagram: {
      title: 'Ways a native dialog closes',
      description: 'All paths converge on the close event, which keeps React in sync.',
      mermaid: `sequenceDiagram
  participant T as Trigger button
  participant H as useDialogState
  participant D as dialog element
  T->>H: open()
  H->>D: showModal()
  Note over D: page behind becomes inert
  alt Escape
    D->>H: cancel event
    D->>H: close event
  else form method dialog
    D->>H: close event with returnValue
  else close(value)
    H->>D: close(value)
    D->>H: close event
  end
  H->>H: isOpen = false
  H->>T: focus()`,
    },
  },
];
