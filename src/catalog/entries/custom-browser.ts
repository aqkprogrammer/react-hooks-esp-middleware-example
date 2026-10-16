import type { CatalogEntry } from '../types';

export const entries: CatalogEntry[] = [
  {
    id: 'use-event-listener',
    title: 'useEventListener',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary: 'Typed, SSR-safe DOM event subscription that always calls the latest handler.',
    tags: ['events', 'dom', 'window', 'document', 'cleanup', 'stale closure'],
    demo: 'examples/custom-hooks/browser/UseEventListenerDemo.tsx',
    sources: ['hooks/browser/useEventListener.ts', 'hooks/state/useLatest.ts'],
    tests: [
      'hooks/browser/useEventListener.test.tsx',
      'examples/custom-hooks/browser/UseEventListenerDemo.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: 'No-op on the server; listeners attach after hydration.',
    },
    officialDocs: [
      {
        label: 'Connecting to an external system',
        url: 'https://react.dev/learn/synchronizing-with-effects',
      },
      {
        label: 'MDN: addEventListener',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener',
      },
    ],
    related: ['use-latest', 'use-media-query'],
    concept:
      'Adds an event listener in an effect and removes it in the cleanup. The handler is kept in a ref, so a new handler on every render does not re-subscribe.',
    problem:
      'Hand-written listener effects either re-subscribe on every render (when the handler is a dependency) or call a stale handler (when it is omitted). Forgetting cleanup leaks listeners.',
    whenToUse: [
      'Global events React does not expose as props: `resize`, `keydown` on window, `visibilitychange`, `online`.',
      'Events on non-element targets: `MediaQueryList`, `WebSocket`, `BroadcastChannel`.',
    ],
    whenNotToUse: [
      'Events on elements you render — use JSX props such as `onClick`, which React delegates efficiently.',
    ],
    api: {
      signature:
        'function useEventListener(type: string, handler: (event: Event) => void, target?: EventTarget | RefObject<EventTarget | null> | null, options?: { capture?: boolean; passive?: boolean; once?: boolean }): void',
      params: [
        {
          name: 'type',
          type: 'string',
          description: 'Event name; typed overloads infer the event object.',
        },
        {
          name: 'handler',
          type: '(event) => void',
          description: 'Called with the event. May change every render.',
        },
        {
          name: 'target',
          type: 'EventTarget | RefObject | null',
          description: '`undefined` = window, a ref, any EventTarget, or `null` to disable.',
          optional: true,
        },
        {
          name: 'options',
          type: '{ capture, passive, once }',
          description: 'Listener options.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    execution: [
      'Render: the latest handler is captured by `useLatest`.',
      'Layout effect: the handler ref is updated.',
      'Effect: the target is resolved (refs are read here, after React attached them) and the listener added.',
      'Cleanup (unmount, or type/target/options change): the same listener function is removed.',
    ],
    mistakes: [
      {
        title: 'Missing cleanup',
        wrong: "useEffect(() => {\n  window.addEventListener('resize', onResize);\n}, []);",
        why: 'Every mount adds another listener (Strict Mode mounts twice in development), and unmounted components keep receiving events.',
        right:
          "useEffect(() => {\n  window.addEventListener('resize', onResize);\n  return () => window.removeEventListener('resize', onResize);\n}, [onResize]);",
      },
      {
        title: 'Removing a different function',
        wrong:
          "useEffect(() => {\n  window.addEventListener('scroll', () => track());\n  return () => window.removeEventListener('scroll', () => track());\n}, []);",
        why: 'Two different arrow functions — the original listener is never removed.',
      },
    ],
    edgeCases: [
      'Ref targets are read when the effect runs; if the element is swapped without a re-render, pass the element itself instead.',
      'Changing `capture` re-subscribes because removal must use the same capture flag.',
      'Conditionally disabling with `enabled ? undefined : null` keeps the typed window event (the window overload accepts `Window | null | undefined`).',
    ],
    testing:
      'Tests assert that every added listener is removed on unmount, that changing the handler does not re-subscribe, ref targets work and `null` disables the listener.',
    production: [
      'Use `{ passive: true }` for scroll/touch/pointer listeners you never `preventDefault()`.',
    ],
  },
  {
    id: 'use-media-query',
    title: 'useMediaQuery',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary: 'Subscribe to a CSS media query with `useSyncExternalStore` — tear-free and SSR-safe.',
    tags: ['responsive', 'matchMedia', 'breakpoints', 'useSyncExternalStore', 'ssr'],
    demo: 'examples/custom-hooks/browser/UseMediaQueryDemo.tsx',
    sources: ['hooks/browser/useMediaQuery.ts'],
    tests: [
      'hooks/browser/useMediaQuery.test.tsx',
      'hooks/storage/storage.ssr.test.tsx',
      'examples/custom-hooks/browser/UseMediaQueryDemo.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Falls back to `defaultValue` without `matchMedia`; supports the legacy `addListener` API.',
    },
    officialDocs: [
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
      {
        label: 'MDN: matchMedia',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia',
      },
    ],
    related: ['use-event-listener', 'use-local-storage'],
    concept: 'Returns whether a media query currently matches and re-renders when that changes.',
    problem:
      '`useState` + `useEffect` versions render the wrong value first (a visible flash) and can tear during concurrent rendering.',
    whenToUse: [
      'Rendering different component trees per breakpoint, or reacting to user preferences in JS.',
    ],
    whenNotToUse: [
      'Pure styling — CSS media queries work without JavaScript and before hydration.',
    ],
    api: {
      signature:
        'function useMediaQuery(query: string, options?: { defaultValue?: boolean }): boolean',
      params: [
        { name: 'query', type: 'string', description: 'A media query, e.g. `(min-width: 768px)`.' },
        {
          name: 'options.defaultValue',
          type: 'boolean',
          description: 'Used on the server and without `matchMedia`. Default `false`.',
          optional: true,
        },
      ],
      returns: '`true` when the query matches.',
    },
    edgeCases: [
      'On the server the default value renders; after hydration React re-renders with the real value.',
      'Changing `query` re-subscribes because `subscribe` is memoised on it.',
    ],
    testing: 'Tests use an installable `matchMedia` fake to flip matches and swap queries.',
  },
  {
    id: 'use-click-outside',
    title: 'useClickOutside',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary: 'Close popovers and menus when the user presses outside one or more elements.',
    tags: ['dropdown', 'popover', 'menu', 'outside click', 'pointerdown', 'capture', 'dismiss'],
    demo: 'examples/custom-hooks/browser/UseClickOutsideDemo.tsx',
    sources: ['hooks/browser/useClickOutside.ts', 'hooks/state/useLatest.ts'],
    tests: [
      'hooks/browser/useClickOutside.test.tsx',
      'examples/custom-hooks/browser/UseClickOutsideDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes:
        'Pointer Events everywhere modern; falls back to `mousedown` + `touchstart` without `PointerEvent`. No-op on the server.',
    },
    officialDocs: [
      {
        label: 'MDN: pointerdown event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerdown_event',
      },
      {
        label: 'MDN: Event.composedPath()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath',
      },
    ],
    related: ['use-event-listener', 'use-focus-within', 'use-latest'],
    concept:
      'Listens for presses on `document` (capture phase) and calls your handler when the pressed node is outside every element in `refs` and not inside an `ignore` selector or ref.',
    problem:
      'Hand-rolled versions listen in the bubble phase (missing presses when something calls `stopPropagation()`), check a single element (breaking portalled menus), re-subscribe on every render, or close the menu and immediately reopen it when its own toggle button is pressed.',
    whenToUse: [
      'Dismissing non-modal popovers, dropdowns, context menus and inline editors.',
      'Several elements form one "inside": a trigger plus a menu rendered in a portal.',
    ],
    whenNotToUse: [
      'Modal dialogs — use `<dialog>`/`showModal()` or a backdrop element whose click closes the dialog.',
      'As the only way to close: keyboard users never click outside. Pair with Escape and, for non-modal popovers, `useFocusWithin`.',
      'The native Popover API (`popover` attribute) gives light-dismiss for free in current browsers.',
    ],
    api: {
      signature:
        "function useClickOutside(refs: RefObject<Element | null> | RefObject<Element | null>[], handler: (event: MouseEvent | TouchEvent) => void, options?: { enabled?: boolean; events?: ('pointerdown' | 'mousedown' | 'touchstart' | 'click')[]; ignore?: (string | RefObject<Element | null>)[] }): void",
      params: [
        {
          name: 'refs',
          type: 'RefObject | RefObject[]',
          description: 'Element(s) that count as inside. Read at event time.',
        },
        {
          name: 'handler',
          type: '(event) => void',
          description: 'Called for outside presses. The latest one is always used.',
        },
        {
          name: 'options.enabled',
          type: 'boolean',
          description: 'Attach listeners only while `true` (e.g. while open). Default `true`.',
          optional: true,
        },
        {
          name: 'options.events',
          type: 'string[]',
          description: 'Defaults to `pointerdown` (fallback: `mousedown` + `touchstart`).',
          optional: true,
        },
        {
          name: 'options.ignore',
          type: '(string | RefObject)[]',
          description: 'Selectors (matched with `closest()`) or refs that never count as outside.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    execution: [
      'Render: `handler`, `refs` and `ignore` are stored in refs via `useLatest`; `events` is reduced to a string key.',
      'Effect (when `enabled`): one capture-phase, passive listener per event type is added to `document`.',
      'Event: the target is checked against `composedPath()` and `contains()` for every ref, then against `ignore`; only then is the handler called.',
      'Cleanup (unmount, `enabled` → false, events change): the same listeners are removed.',
    ],
    mistakes: [
      {
        title: 'Toggle button fights the hook',
        wrong:
          'useClickOutside(menuRef, () => setOpen(false));\n<button onClick={() => setOpen((o) => !o)}>Menu</button>',
        why: 'Pressing the button is "outside" the menu: the hook closes it, then the click handler toggles it open again.',
        right: 'useClickOutside(menuRef, () => setOpen(false), { ignore: [buttonRef] });',
      },
      {
        title: 'Listening for `click` in the bubble phase',
        wrong: "document.addEventListener('click', onDocumentClick);",
        why: 'A `stopPropagation()` anywhere inside hides the click, and the clicked element may already be unmounted by React when the event reaches `document`.',
      },
    ],
    edgeCases: [
      'Presses on nodes already removed from the document are ignored (they cannot be judged reliably).',
      'Shadow DOM: `composedPath()` is checked, so presses inside web components count as inside their host.',
      'The listener is passive, so the handler cannot `preventDefault()` the press.',
      'iframes: presses inside an iframe never reach the parent document.',
    ],
    testing:
      'Tests cover multiple refs, selector and ref `ignore`, `stopPropagation` inside (capture still fires), latest handler without re-subscribing, custom events, the no-PointerEvent fallback, detached targets and listener removal.',
    production: [
      'Pass `enabled: open` so closed popovers cost nothing.',
      'Also close on Escape and return focus to the trigger.',
    ],
    diagram: {
      title: 'Deciding whether a press is outside',
      description: 'The checks the capture-phase listener runs for every press.',
      mermaid:
        'flowchart TD\n  A[pointerdown on document, capture phase] --> B{target still connected?}\n  B -- no --> X[ignore]\n  B -- yes --> C{inside any ref?}\n  C -- yes --> X\n  C -- no --> D{matches an ignore selector or ref?}\n  D -- yes --> X\n  D -- no --> E[call latest handler]',
    },
  },
  {
    id: 'use-hover',
    title: 'useHover',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary: 'Know whether a pointer is over an element: `[ref, isHovered]` via pointer events.',
    tags: ['hover', 'pointerenter', 'pointerleave', 'callback ref', 'preview', 'prefetch'],
    demo: 'examples/custom-hooks/browser/UseHoverDemo.tsx',
    sources: ['hooks/browser/useHover.ts'],
    tests: [
      'hooks/browser/useHover.test.tsx',
      'examples/custom-hooks/browser/UseHoverDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'client-only', notes: '`false` on the server and on devices without hover.' },
    officialDocs: [
      {
        label: 'MDN: pointerenter event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerenter_event',
      },
      {
        label: 'MDN: PointerEvent.pointerType',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType',
      },
    ],
    related: ['use-focus', 'use-media-query', 'use-event-listener'],
    concept:
      'Returns a callback ref and a boolean. `pointerenter`/`pointerleave` on the attached element flip the boolean; touch "hover" is ignored by default.',
    problem:
      '`mouseover`/`mouseout` bubble and flicker when moving across children; `useRef` + effect versions miss elements that mount later; touch devices emulate hover on tap and leave it stuck.',
    whenToUse: [
      'Behaviour on hover: prefetching a route, starting a video preview, delayed tooltips, analytics.',
    ],
    whenNotToUse: [
      'Pure styling — CSS `:hover` needs no JavaScript or re-render.',
      'Essential content or actions: hover is unavailable to keyboard and most touch users. Also expose them on focus or click (as the demo does).',
    ],
    api: {
      signature:
        'function useHover<T extends Element = HTMLElement>(options?: { ignoreTouch?: boolean; onChange?: (isHovered: boolean, event: PointerEvent) => void }): readonly [ref: (node: T | null) => void, isHovered: boolean]',
      params: [
        {
          name: 'options.ignoreTouch',
          type: 'boolean',
          description: 'Ignore `pointerType === "touch"`. Default `true`.',
          optional: true,
        },
        {
          name: 'options.onChange',
          type: '(isHovered, event) => void',
          description: 'Called on every change; the latest callback is used.',
          optional: true,
        },
      ],
      returns:
        'A tuple: a stable **callback ref** to put on the element, and `isHovered`. A tuple (not an object) because results containing a `ref` property must be destructured anyway (see mistakes).',
    },
    execution: [
      'The callback ref stores the element in state, so swapping elements re-runs the effect.',
      'Effect: `pointerenter`/`pointerleave` listeners are attached to that element and removed in cleanup.',
      'State stores *which* element is hovered; `isHovered` is derived, so a swapped element is never reported as hovered.',
    ],
    mistakes: [
      {
        title: 'Hiding information behind hover',
        wrong: '{isHovered && <p>Price: €20</p>}',
        why: 'Keyboard and touch users can never see it (WCAG 1.4.13 / 2.1.1).',
        right: '{(isHovered || isFocused || expanded) && <p>Price: €20</p>}',
      },
    ],
    edgeCases: [
      'If the element is removed while hovered, no `pointerleave` fires — the derived state still resets because the element changed.',
      'Pens and mice report `pointerType` `pen`/`mouse`; synthetic events without a pointer type count as non-touch.',
    ],
    testing:
      'Tests fire pointer events with different `pointerType`s, swap the element (keyed) to check the reset, and assert listener removal on unmount.',
  },
  {
    id: 'use-focus',
    title: 'useFocus',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      'Whether an element itself has focus: `[ref, isFocused]`, including autofocused elements.',
    tags: ['focus', 'blur', 'activeElement', 'callback ref', 'keyboard'],
    demo: 'examples/custom-hooks/browser/UseFocusDemo.tsx',
    sources: ['hooks/browser/useFocus.ts'],
    tests: [
      'hooks/browser/useFocus.test.tsx',
      'examples/custom-hooks/browser/UseFocusDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'client-only', notes: '`false` on the server.' },
    officialDocs: [
      {
        label: 'MDN: focus event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/focus_event',
      },
      {
        label: 'MDN: Document.activeElement',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement',
      },
    ],
    related: ['use-focus-within', 'use-hover'],
    concept:
      'Listens to `focus`/`blur` on the attached element and also checks `document.activeElement` when the ref attaches, so elements focused before the listener existed are detected.',
    problem:
      'Tracking focus with `onFocus`/`onBlur` props works for your own JSX, but not for elements you get through a ref (third-party inputs), and an effect-based version misses `autoFocus`, which React applies before effects run.',
    whenToUse: [
      'Showing hints, shortcuts or a "Press Enter to…" message while one control is focused.',
      'Elements rendered by a library where you only have a ref.',
    ],
    whenNotToUse: [
      'Styling — use `:focus` / `:focus-visible` in CSS.',
      'Your own JSX where `onFocus`/`onBlur` props are simpler.',
      'Groups of controls — `useFocusWithin` handles focus moving between children.',
    ],
    api: {
      signature:
        'function useFocus<T extends HTMLElement | SVGElement = HTMLElement>(options?: { onChange?: (isFocused: boolean, event: FocusEvent) => void }): readonly [ref: (node: T | null) => void, isFocused: boolean]',
      params: [
        {
          name: 'options.onChange',
          type: '(isFocused, event) => void',
          description: 'Called on focus and blur.',
          optional: true,
        },
      ],
      returns: 'A stable callback ref and `isFocused`.',
    },
    edgeCases: [
      'Focus on a descendant does not count; `focus`/`blur` do not bubble.',
      'When the window loses focus the element receives `blur`, so `isFocused` becomes `false` until the user returns.',
    ],
    testing:
      'Tests click and tab with user-event, attach the ref to an already-focused input, and check that no callbacks fire after unmount.',
  },
  {
    id: 'use-focus-within',
    title: 'useFocusWithin',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'Focus state for a whole subtree, with enter/leave callbacks that use `relatedTarget` so moving inside does not count.',
    tags: ['focus-within', 'focusin', 'focusout', 'relatedTarget', 'popover', 'validation'],
    demo: 'examples/custom-hooks/browser/UseFocusDemo.tsx',
    sources: ['hooks/browser/useFocusWithin.ts'],
    tests: [
      'hooks/browser/useFocusWithin.test.tsx',
      'examples/custom-hooks/browser/UseFocusDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'client-only', notes: '`false` on the server.' },
    officialDocs: [
      {
        label: 'MDN: focusout event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/focusout_event',
      },
      {
        label: 'MDN: FocusEvent.relatedTarget',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent/relatedTarget',
      },
      {
        label: 'MDN: :focus-within',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-within',
      },
    ],
    related: ['use-focus', 'use-click-outside'],
    concept:
      'Listens to bubbling `focusin`/`focusout` on a container. On `focusout`, `relatedTarget` (the element about to receive focus) decides: still inside → nothing happens; outside or `null` → `onBlurWithin` fires and the state turns `false`.',
    problem:
      'A plain `onBlur` on a group fires every time focus moves between its own fields, so "close the popover when focus leaves" or "validate the address when the user is done with it" fire far too early.',
    whenToUse: [
      'Closing non-modal popovers, menus and comboboxes when keyboard focus leaves them.',
      'Validating or saving a group of fields once the user leaves the group.',
    ],
    whenNotToUse: [
      'Styling the group — CSS `:focus-within` does it without JavaScript.',
      'Modal dialogs, which should trap focus instead of reacting to it leaving.',
    ],
    api: {
      signature:
        'function useFocusWithin<T extends HTMLElement | SVGElement = HTMLElement>(options?: { onFocusWithin?: (event: FocusEvent) => void; onBlurWithin?: (event: FocusEvent) => void }): readonly [ref: (node: T | null) => void, isFocusWithin: boolean]',
      params: [
        {
          name: 'options.onFocusWithin',
          type: '(event: FocusEvent) => void',
          description: 'Focus entered from outside.',
          optional: true,
        },
        {
          name: 'options.onBlurWithin',
          type: '(event: FocusEvent) => void',
          description: 'Focus left the subtree (including to nothing, or the window blurring).',
          optional: true,
        },
      ],
      returns: 'A stable callback ref and `isFocusWithin`.',
    },
    mistakes: [
      {
        title: 'Using blur for a group',
        wrong: '<fieldset onBlur={() => validate()}>',
        why: 'React’s `onBlur` bubbles (it is `focusout`): it fires when tabbing from Street to City, inside the same group.',
        right:
          '<fieldset onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) validate(); }}>',
      },
    ],
    edgeCases: [
      'Clicking a non-focusable area inside the group moves focus to `body` (`relatedTarget` is `null`) and counts as leaving.',
      'Switching windows/tabs fires `focusout` with `relatedTarget: null`; returning fires `focusin` again.',
      'Some browsers fire no `focusout` when the focused element is removed from the DOM; the state then stays `true` until focus changes again.',
    ],
    testing:
      'Tests tab into, within and out of a fieldset and assert exactly one enter and one leave callback, the `relatedTarget` passed out, the `null` relatedTarget case and listener removal.',
    diagram: {
      title: 'focusout decision',
      description: 'How `relatedTarget` separates moving inside from leaving.',
      mermaid:
        'flowchart LR\n  A[focusout inside container] --> B{relatedTarget inside container?}\n  B -- yes --> C[focus moved within: do nothing]\n  B -- no or null --> D[isFocusWithin = false and onBlurWithin]',
    },
  },
  {
    id: 'use-intersection-observer',
    title: 'useIntersectionObserver',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'Visibility of an element in the viewport or a scroll container, with thresholds, rootMargin and freeze-once-visible.',
    tags: [
      'IntersectionObserver',
      'lazy loading',
      'infinite scroll',
      'viewport',
      'visibility',
      'analytics',
    ],
    demo: 'examples/custom-hooks/browser/UseIntersectionObserverDemo.tsx',
    sources: ['hooks/browser/useIntersectionObserver.ts', 'hooks/browser/shared.ts'],
    tests: [
      'hooks/browser/useIntersectionObserver.test.tsx',
      'examples/custom-hooks/browser/UseIntersectionObserverDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Supported in all current browsers (Safari since 12.1). Missing in old browsers and jsdom: `isSupported` is `false` and `initialIsIntersecting` is reported.',
    },
    officialDocs: [
      {
        label: 'MDN: Intersection Observer API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API',
      },
      {
        label: 'MDN: IntersectionObserverEntry',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry',
      },
    ],
    related: ['use-resize-observer', 'use-scroll-position'],
    concept:
      'Creates one `IntersectionObserver` for the element attached through the returned callback ref and stores the latest entry. `isIntersecting`, `entry` and `isSupported` are returned.',
    problem:
      'Scroll listeners plus `getBoundingClientRect()` force layout on every scroll event. Hand-written observer effects often forget `disconnect()`, re-create the observer on every render because `threshold={[0, 1]}` is a new array, or keep reporting an entry of a previous element.',
    whenToUse: [
      'Lazy-loading images, iframes or heavy components (`rootMargin` to start early).',
      'Infinite scrolling with a sentinel element; "seen" analytics with `freezeOnceVisible`.',
      'Pausing animations or video that scroll out of view.',
    ],
    whenNotToUse: [
      'Images only: `<img loading="lazy">` is native.',
      'Scroll-linked animation — use CSS scroll-driven animations.',
    ],
    api: {
      signature:
        'function useIntersectionObserver<T extends Element = HTMLElement>(options?: { threshold?: number | number[]; root?: Element | Document | null; rootMargin?: string; freezeOnceVisible?: boolean; initialIsIntersecting?: boolean; enabled?: boolean; onChange?: (entry: IntersectionObserverEntry) => void }): { ref: (node: T | null) => void; isIntersecting: boolean; entry: IntersectionObserverEntry | null; isSupported: boolean }',
      params: [
        {
          name: 'options.threshold',
          type: 'number | number[]',
          description: 'Ratios that trigger callbacks. Compared by value.',
          optional: true,
        },
        {
          name: 'options.root',
          type: 'Element | Document | null',
          description: 'Scroll container (pass the element, e.g. from a callback ref in state).',
          optional: true,
        },
        {
          name: 'options.rootMargin',
          type: 'string',
          description: 'Grow/shrink the root box, e.g. `"200px 0px"`.',
          optional: true,
        },
        {
          name: 'options.freezeOnceVisible',
          type: 'boolean',
          description: 'Disconnect after the first intersecting entry.',
          optional: true,
        },
        {
          name: 'options.initialIsIntersecting',
          type: 'boolean',
          description: 'Value before the first entry, on the server and when unsupported.',
          optional: true,
        },
        {
          name: 'options.enabled',
          type: 'boolean',
          description: 'Default `true`.',
          optional: true,
        },
        {
          name: 'options.onChange',
          type: '(entry) => void',
          description: 'Called for every entry (latest callback).',
          optional: true,
        },
      ],
      returns:
        '`{ ref, isIntersecting, entry, isSupported }`. Destructure it: the React Compiler lint treats an object with a `ref` property as a ref and forbids reading its other fields during render.',
    },
    execution: [
      'Render: `isSupported` comes from a hydration-safe `useSyncExternalStore` check; the stored entry is ignored if it belongs to another element.',
      'Effect: when an element is attached, enabled and not frozen, an observer is created with `{ root, rootMargin, threshold }` and observes it.',
      'Callback: the newest entry for the element is stored; `onChange` is called.',
      'Cleanup: `disconnect()` on unmount, element/option change, disabling or freezing.',
    ],
    mistakes: [
      {
        title: 'New threshold array every render',
        wrong:
          'useEffect(() => {\n  const io = new IntersectionObserver(cb, { threshold: [0, 1] });\n  io.observe(el);\n  return () => io.disconnect();\n}, [el, options]);',
        why: '`options` is a new object each render, so the observer is torn down and recreated constantly (and the initial callback fires again).',
        right: 'Depend on primitives (this hook keys the threshold as a string).',
      },
      {
        title: 'Reading `result.ref` with the compiler lint',
        wrong:
          'const io = useIntersectionObserver();\n<div ref={io.ref}>{io.isIntersecting && <Chart />}</div>',
        why: 'eslint-plugin-react-hooks treats `io` as a ref and reports "Cannot access refs during render".',
        right: 'const { ref, isIntersecting } = useIntersectionObserver();',
      },
    ],
    edgeCases: [
      'The browser delivers an initial entry right after `observe()`, even when not intersecting.',
      'With `threshold: 1`, elements larger than the root can never be fully visible.',
      '`rootMargin` only works for the viewport root when the target is in the same document (not cross-origin iframes).',
    ],
    testing:
      'Tests use `installIntersectionObserver()` to inspect options, trigger entries, check that equal threshold arrays do not re-observe, that freezing and disabling disconnect, and the unsupported fallback.',
    production: [
      'Use one observer per list when observing hundreds of items (a shared observer keyed by element) — one per hook is fine for dozens.',
    ],
  },
  {
    id: 'use-resize-observer',
    title: 'useResizeObserver',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary: 'Run a callback whenever an element (not the window) changes size.',
    tags: ['ResizeObserver', 'size', 'layout', 'charts', 'content-box', 'border-box'],
    demo: 'examples/custom-hooks/browser/UseResizeObserverDemo.tsx',
    sources: ['hooks/browser/useResizeObserver.ts', 'hooks/browser/shared.ts'],
    tests: [
      'hooks/browser/useResizeObserver.test.tsx',
      'examples/custom-hooks/browser/UseResizeObserverDemo.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'All current browsers; `box: "device-pixel-content-box"` is not supported in Safari. Missing in jsdom → `isSupported: false`.',
    },
    officialDocs: [
      {
        label: 'MDN: Resize Observer API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API',
      },
      {
        label: 'MDN: ResizeObserver.observe() options',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/observe',
      },
    ],
    related: ['use-element-size', 'use-intersection-observer', 'use-window-size'],
    concept:
      'Observes `target` with a `ResizeObserver` and calls the latest callback with each `ResizeObserverEntry`. Returns `{ isSupported }`.',
    problem:
      '`window.resize` misses size changes caused by content, fonts, sidebars or CSS. Polling `offsetWidth` forces layout.',
    whenToUse: [
      'Redrawing canvases and charts, virtualised lists, auto-growing textareas, syncing sizes with non-React widgets.',
    ],
    whenNotToUse: [
      'You just need width/height as state — `useElementSize` wraps this hook.',
      'Styling by container size — CSS container queries.',
    ],
    api: {
      signature:
        'function useResizeObserver<T extends Element = Element>(target: T | RefObject<T | null> | null, callback: (entry: ResizeObserverEntry) => void, options?: { box?: ResizeObserverBoxOptions; enabled?: boolean }): { isSupported: boolean }',
      params: [
        {
          name: 'target',
          type: 'Element | RefObject | null',
          description: 'Element or ref (read in the effect). `null` disables.',
        },
        {
          name: 'callback',
          type: '(entry) => void',
          description: 'Latest callback is used without re-observing.',
        },
        {
          name: 'options.box',
          type: "'content-box' | 'border-box' | 'device-pixel-content-box'",
          description: 'Default `content-box`.',
          optional: true,
        },
        {
          name: 'options.enabled',
          type: 'boolean',
          description: 'Default `true`.',
          optional: true,
        },
      ],
      returns: '`{ isSupported }`.',
    },
    edgeCases: [
      'An initial entry is delivered right after `observe()`.',
      'Changing the observed element’s size from the callback in the same frame triggers the harmless "ResizeObserver loop completed with undelivered notifications" error.',
      'A ref target is read when the effect runs; for elements that appear later, pass the element from a callback ref in state.',
    ],
    testing:
      'Tests with `installResizeObserver()` assert the observed box, the latest callback, re-observing on box change, disconnect on unmount, and the unsupported path.',
  },
  {
    id: 'use-element-size',
    title: 'useElementSize',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      'Width and height of an element as state, via ResizeObserver (content-box or border-box).',
    tags: ['size', 'measure', 'ResizeObserver', 'responsive component', 'border-box'],
    demo: 'examples/custom-hooks/browser/UseResizeObserverDemo.tsx',
    sources: ['hooks/browser/useElementSize.ts', 'hooks/browser/useResizeObserver.ts'],
    tests: [
      'hooks/browser/useElementSize.test.tsx',
      'examples/custom-hooks/browser/UseResizeObserverDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Uses `contentBoxSize`/`borderBoxSize`, falling back to `contentRect`/`offsetWidth` on Safari < 15.4. Without ResizeObserver `initialSize` is returned.',
    },
    officialDocs: [
      {
        label: 'MDN: ResizeObserverEntry.borderBoxSize',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/borderBoxSize',
      },
      {
        label: 'MDN: box-sizing',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-sizing',
      },
    ],
    related: ['use-resize-observer', 'use-window-size', 'use-media-query'],
    concept:
      'A callback ref plus `useResizeObserver`: each observation is converted to `{ width, height }` for the requested box and stored — only when it changed.',
    problem:
      'Measuring with `getBoundingClientRect()` in a layout effect gives one reading and misses later changes; storing every observation re-renders even when nothing changed.',
    whenToUse: [
      'Rendering different content depending on the space a component actually gets (not the viewport).',
      'Passing pixel sizes to canvas/SVG/chart libraries.',
    ],
    whenNotToUse: [
      'Only styles change — CSS container queries work before hydration and need no re-render.',
      'You need the size before the first paint on the server: impossible; design a sensible `initialSize`.',
    ],
    api: {
      signature:
        "function useElementSize<T extends Element = HTMLElement>(options?: { box?: 'content-box' | 'border-box'; initialSize?: { width: number; height: number } }): { ref: (node: T | null) => void; width: number; height: number; isSupported: boolean }",
      params: [
        {
          name: 'options.box',
          type: "'content-box' | 'border-box'",
          description: '`content-box` excludes padding/border; `border-box` includes them.',
          optional: true,
        },
        {
          name: 'options.initialSize',
          type: '{ width, height }',
          description: 'Before measuring, on the server and when unsupported. Default `0 × 0`.',
          optional: true,
        },
      ],
      returns: '`{ ref, width, height, isSupported }` — destructure it.',
    },
    edgeCases: [
      'Sizes are logical (inline/block): in vertical writing modes `width` is the vertical extent.',
      'Values can be fractional; round for display.',
      'Switching `box` or the element invalidates the previous measurement immediately.',
    ],
    testing:
      'Tests drive the ResizeObserver fake (including entries without box-size arrays), count commits with `<Profiler>` to prove identical sizes do not re-render, and check the unsupported fallback.',
  },
  {
    id: 'use-mutation-observer',
    title: 'useMutationObserver',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'advanced',
    summary: 'React to DOM changes made outside React (third-party widgets, contenteditable).',
    tags: ['MutationObserver', 'DOM changes', 'third-party', 'contenteditable', 'attributes'],
    demo: 'examples/custom-hooks/browser/UseMutationObserverDemo.tsx',
    sources: ['hooks/browser/useMutationObserver.ts'],
    tests: [
      'hooks/browser/useMutationObserver.test.tsx',
      'examples/custom-hooks/browser/UseMutationObserverDemo.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Supported everywhere (including jsdom); `isSupported` guards exotic environments and SSR.',
    },
    officialDocs: [
      {
        label: 'MDN: MutationObserver',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver',
      },
      {
        label: 'MDN: MutationObserver.observe() options',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe',
      },
    ],
    related: ['use-resize-observer', 'use-event-listener'],
    concept:
      'Observes `target` with `MutationObserverInit` options and passes batched `MutationRecord`s to the latest callback. Options are compared by value.',
    problem:
      'Polling the DOM is wasteful; inline options objects in effect dependencies re-create the observer on every render; forgetting `disconnect()` keeps detached trees alive.',
    whenToUse: [
      'Integrating widgets that change their own DOM (embeds, editors, ad slots).',
      'Watching attributes another script toggles (e.g. a `class` on `<html>` for a theme).',
    ],
    whenNotToUse: [
      'DOM that React renders from your own state — you already know when it changes; derive instead.',
      'Size changes — use `useResizeObserver`; visibility — `useIntersectionObserver`.',
    ],
    api: {
      signature:
        'function useMutationObserver(target: Node | RefObject<Node | null> | null, callback: (records: MutationRecord[], observer: MutationObserver) => void, options: MutationObserverInit): { isSupported: boolean }',
      params: [
        { name: 'target', type: 'Node | RefObject | null', description: '`null` stops observing.' },
        { name: 'callback', type: '(records, observer) => void', description: 'Latest callback.' },
        {
          name: 'options',
          type: 'MutationObserverInit',
          description:
            'At least one of `childList`, `attributes`, `characterData` (or an option implying it).',
        },
      ],
      returns: '`{ isSupported }`.',
    },
    mistakes: [
      {
        title: 'Observing with no mutation type',
        wrong: 'useMutationObserver(ref, onChange, { subtree: true });',
        why: '`observe()` throws a `TypeError`; the error surfaces in the nearest error boundary.',
        right: 'useMutationObserver(ref, onChange, { childList: true, subtree: true });',
      },
    ],
    edgeCases: [
      'Callbacks run as microtasks, batched; several synchronous changes arrive in one call.',
      'Records still queued when the observer disconnects are dropped.',
      '`attributeOldValue`/`characterDataOldValue` are required to see previous values.',
    ],
    testing:
      'Tests mutate real jsdom nodes and await the batched records, assert equal option literals do not re-observe, disconnect on unmount and the unsupported path.',
  },
  {
    id: 'use-window-size',
    title: 'useWindowSize',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      'Viewport width and height via `useSyncExternalStore`, with an SSR default and optional throttling.',
    tags: ['resize', 'viewport', 'innerWidth', 'useSyncExternalStore', 'throttle', 'ssr'],
    demo: 'examples/custom-hooks/browser/UseWindowSizeDemo.tsx',
    sources: ['hooks/browser/useWindowSize.ts'],
    tests: [
      'hooks/browser/useWindowSize.test.tsx',
      'examples/custom-hooks/browser/UseWindowSizeDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: '`serverSize` (default `0 × 0`) during SSR and hydration.',
    },
    officialDocs: [
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
      {
        label: 'MDN: Window.innerWidth',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth',
      },
    ],
    related: ['use-media-query', 'use-element-size', 'use-event-listener'],
    concept:
      'Subscribes to `resize` and reads `innerWidth`/`innerHeight` through `useSyncExternalStore`. A module-level cached snapshot keeps the object identity stable while the size is unchanged.',
    problem:
      '`useState(window.innerWidth)` crashes on the server and mismatches during hydration; returning a fresh object from `getSnapshot` makes React re-render forever; drag-resizing re-renders dozens of times per second.',
    whenToUse: ['Numbers that depend on the viewport: canvas sizes, positioning overlays.'],
    whenNotToUse: [
      'Breakpoints — `useMediaQuery` re-renders only when a breakpoint is crossed.',
      'The size of a component’s container — `useElementSize`.',
    ],
    api: {
      signature:
        'function useWindowSize(options?: { serverSize?: { width: number; height: number }; throttleMs?: number }): { width: number; height: number }',
      params: [
        {
          name: 'options.serverSize',
          type: '{ width, height }',
          description: 'Rendered on the server and during hydration. Default `0 × 0`.',
          optional: true,
        },
        {
          name: 'options.throttleMs',
          type: 'number',
          description: 'Leading + trailing throttle of re-renders. `0` = every event.',
          optional: true,
        },
      ],
      returns: 'A stable `{ width, height }` object (same identity while unchanged).',
    },
    mistakes: [
      {
        title: 'New snapshot object on every call',
        wrong:
          'useSyncExternalStore(subscribe, () => ({ width: innerWidth, height: innerHeight }));',
        why: 'React compares snapshots with `Object.is`; a fresh object is always "changed", causing an infinite re-render loop.',
        right: 'Cache the snapshot and return the cached object while values are equal.',
      },
    ],
    edgeCases: [
      '`innerWidth` includes the vertical scrollbar; use `document.documentElement.clientWidth` to exclude it.',
      'On mobile, the dynamic toolbar changes `innerHeight` while scrolling.',
      'Throttling limits re-renders caused by resizing; a render for another reason still reads the current size.',
    ],
    testing:
      'Tests override `innerWidth`/`innerHeight`, assert snapshot identity, the leading/trailing throttle with fake timers and that the listener and pending timer are cleaned up.',
  },
  {
    id: 'use-scroll-position',
    title: 'useScrollPosition',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'Scroll offset of the window or an element, with a passive listener and one update per frame.',
    tags: ['scroll', 'scrollY', 'requestAnimationFrame', 'passive', 'progress', 'performance'],
    demo: 'examples/custom-hooks/browser/UseScrollPositionDemo.tsx',
    sources: ['hooks/browser/useScrollPosition.ts', 'hooks/browser/shared.ts'],
    tests: [
      'hooks/browser/useScrollPosition.test.tsx',
      'examples/custom-hooks/browser/UseScrollPositionDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: '`{ x: 0, y: 0 }` on the server and until the first frame.',
    },
    officialDocs: [
      {
        label: 'MDN: Improving scroll performance with passive listeners',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scroll_performance_using_passive_listeners',
      },
      {
        label: 'MDN: requestAnimationFrame',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame',
      },
    ],
    related: ['use-intersection-observer', 'use-scroll-lock', 'use-event-listener'],
    concept:
      'A passive `scroll` listener schedules at most one `requestAnimationFrame`; the frame reads `scrollX/scrollY` (or `scrollLeft/scrollTop`) and updates state only if the position changed.',
    problem:
      'Scroll events can fire more often than the screen refreshes; setting state in each one re-renders needlessly, and non-passive listeners can delay scrolling on touch devices.',
    whenToUse: [
      'Showing scroll offsets or a reading-progress value, "back to top" buttons, restoring positions.',
    ],
    whenNotToUse: [
      'Sticky headers, parallax and progress bars that are purely visual — CSS `position: sticky` and scroll-driven animations avoid React renders entirely.',
      '"Is this element visible?" — `useIntersectionObserver`.',
    ],
    api: {
      signature:
        'function useScrollPosition(target?: Element | RefObject<Element | null> | null): { x: number; y: number }',
      params: [
        {
          name: 'target',
          type: 'Element | RefObject | null',
          description: 'Omit for the window; `null` disables.',
          optional: true,
        },
      ],
      returns: '`{ x, y }` in CSS pixels.',
    },
    execution: [
      'Effect: resolves the target, schedules an initial read in the next frame and adds a passive `scroll` listener.',
      'Scroll: if no frame is pending, one is requested; extra events in the same frame are dropped.',
      'Frame: reads the position and sets state (bailing out when unchanged).',
      'Cleanup: removes the listener and cancels a pending frame.',
    ],
    edgeCases: [
      'Elastic overscroll on macOS/iOS can report negative or overshooting values.',
      'When the target changes to `null` the last position is kept.',
    ],
    testing:
      'Tests use fake timers (which also fake `requestAnimationFrame`) to prove three scroll events cause one render, check the passive option, element targets and that the frame and listener are cleaned up.',
  },
  {
    id: 'use-scroll-lock',
    title: 'useScrollLock',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'Lock page scrolling for modals with scrollbar-gap compensation, exact style restoration and nested-lock counting.',
    tags: ['modal', 'overflow hidden', 'body scroll', 'scrollbar gap', 'reference counting'],
    demo: 'examples/custom-hooks/browser/UseScrollLockDemo.tsx',
    sources: ['hooks/browser/useScrollLock.ts'],
    tests: [
      'hooks/browser/useScrollLock.test.tsx',
      'examples/custom-hooks/browser/UseScrollLockDemo.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes:
        'iOS Safari before 16 ignores `overflow: hidden` on `body` for touch scrolling. No-op on the server.',
    },
    officialDocs: [
      {
        label: 'MDN: overflow',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow',
      },
      {
        label: 'MDN: scrollbar-gutter',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter',
      },
    ],
    related: ['use-click-outside', 'use-scroll-position'],
    concept:
      'While `locked`, sets `overflow: hidden` on `body` and adds the scrollbar width to its `padding-right`. A module-level counter lets several components lock at once; the first lock saves the inline styles and the last unlock restores them.',
    problem:
      'Naive versions set `overflow = ""` on close (destroying styles the page had), shift the layout when the scrollbar disappears, and unlock the page while a second overlay is still open.',
    whenToUse: ['Custom modals, drawers, full-screen menus and lightboxes.'],
    whenNotToUse: [
      'Non-modal popovers, menus and toasts: the page should stay scrollable behind them.',
    ],
    api: {
      signature:
        'function useScrollLock(locked?: boolean, options?: { reserveScrollbarGap?: boolean }): void',
      params: [
        { name: 'locked', type: 'boolean', description: 'Default `true`.', optional: true },
        {
          name: 'options.reserveScrollbarGap',
          type: 'boolean',
          description:
            'Pad `body` by the scrollbar width. Default `true`; decided by the outermost lock.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    execution: [
      'Layout effect (before paint) when `locked`: increments the counter; on the first lock saves inline `overflow`/`padding-right`, measures `innerWidth - clientWidth` and applies the styles.',
      'Cleanup (unmount or `locked` → false): decrements; at zero restores the saved inline styles exactly.',
    ],
    mistakes: [
      {
        title: 'Resetting instead of restoring',
        wrong:
          "useEffect(() => {\n  document.body.style.overflow = 'hidden';\n  return () => { document.body.style.overflow = ''; };\n}, []);",
        why: 'Wipes an inline style the page had, and the first of two nested modals to close unlocks the page while the other is still open.',
      },
    ],
    edgeCases: [
      '`position: fixed` elements are not padded and may still shift — or use `scrollbar-gutter: stable` on `html`.',
      'Overlay scrollbars (macOS default, mobile) have zero width, so no padding is added.',
      'Scrollable content inside the overlay still scrolls; add `overscroll-behavior: contain` to stop scroll chaining.',
      'A native `<dialog>` opened with `showModal()` makes the page inert but does not stop it scrolling — lock it with this hook too.',
    ],
    testing:
      'Tests assert locking, exact restoration of pre-existing inline styles, padding compensation (with an overridden `clientWidth`), opting out, and nested reference counting.',
    diagram: {
      title: 'Nested locks',
      description: 'Only the transition from 0 to 1 lock and back changes styles.',
      mermaid:
        'stateDiagram-v2\n  [*] --> Unlocked\n  Unlocked --> Locked: first lock saves styles\n  Locked --> Locked: more locks increment count\n  Locked --> Locked: unlock with count above 1\n  Locked --> Unlocked: last unlock restores styles',
    },
  },
  {
    id: 'use-fullscreen',
    title: 'useFullscreen',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'Enter, exit and toggle full screen for an element, with live state and error capture.',
    tags: ['Fullscreen API', 'requestFullscreen', 'presentation', 'video', 'webkit prefix'],
    demo: 'examples/custom-hooks/browser/UseFullscreenDemo.tsx',
    sources: ['hooks/browser/useFullscreen.ts', 'hooks/browser/shared.ts'],
    tests: [
      'hooks/browser/useFullscreen.test.tsx',
      'examples/custom-hooks/browser/UseFullscreenDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Unprefixed in Chromium, Firefox and Safari 16.4+; older Safari uses the `webkit` prefix (handled). iPhone Safari only supports full screen for `<video>` (via `webkitEnterFullscreen`), so `isSupported` is `false` there. Iframes need `allow="fullscreen"`.',
    },
    officialDocs: [
      {
        label: 'MDN: Fullscreen API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API',
      },
      {
        label: 'MDN: Element.requestFullscreen()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen',
      },
      {
        label: 'MDN: fullscreenchange event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event',
      },
    ],
    related: ['use-event-listener', 'use-scroll-lock'],
    concept:
      '`isFullscreen` is derived from `document.fullscreenElement` through `useSyncExternalStore` (subscribed to `fullscreenchange` and `webkitfullscreenchange`). `enter`/`exit`/`toggle` call the standard API or its prefixed fallback and store failures in `error`.',
    problem:
      'Local `isFullscreen` state goes stale when the user leaves with Esc or the browser UI; unhandled promise rejections appear when `requestFullscreen()` runs without a user gesture; prefix differences break older Safari.',
    whenToUse: ['Presentations, image/video viewers, games, dashboards on wall screens.'],
    whenNotToUse: ['Plain `<video>` — the native controls already include full screen.'],
    api: {
      signature:
        'function useFullscreen<T extends Element = HTMLElement>(options?: { fullscreenOptions?: FullscreenOptions }): { ref: (node: T | null) => void; isFullscreen: boolean; isSupported: boolean; enter(): Promise<void>; exit(): Promise<void>; toggle(): Promise<void>; error: Error | null }',
      params: [
        {
          name: 'options.fullscreenOptions',
          type: 'FullscreenOptions',
          description: 'Passed to `requestFullscreen` (`navigationUI`).',
          optional: true,
        },
      ],
      returns:
        '`{ ref, isFullscreen, isSupported, enter, exit, toggle, error }`. The promises never reject. Destructure the result (it contains `ref`).',
    },
    mistakes: [
      {
        title: 'Requesting full screen without a gesture',
        wrong: 'useEffect(() => { void enter(); }, []);',
        why: 'Browsers require transient user activation; the request is rejected (`error` is set).',
        right: '<button onClick={() => void enter()}>Full screen</button>',
      },
    ],
    edgeCases: [
      '`isFullscreen` is `false` when *another* element is full screen.',
      '`exit()` is a no-op when nothing is full screen (the native call would reject).',
      'Controls rendered outside the element are not visible in full screen — put them inside.',
    ],
    testing:
      'Tests stub `fullscreenEnabled`, `fullscreenElement`, `requestFullscreen` and `exitFullscreen`, dispatch `fullscreenchange` externally (Esc), check rejected requests, the webkit fallback, the unsupported path and listener removal.',
  },
  {
    id: 'use-document-title',
    title: 'useDocumentTitle',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      'Set `document.title` from a component, optionally restoring the previous title on unmount.',
    tags: ['title', 'document.title', 'tab', 'unread count', 'head'],
    demo: 'examples/custom-hooks/browser/UseDocumentTitleDemo.tsx',
    sources: ['hooks/browser/useDocumentTitle.ts'],
    tests: [
      'hooks/browser/useDocumentTitle.test.tsx',
      'examples/custom-hooks/browser/UseDocumentTitleDemo.test.tsx',
    ],
    minReact: '16.8',
    support: { level: 'client-only', notes: 'Nothing happens on the server (effects do not run).' },
    officialDocs: [
      {
        label: 'MDN: Document.title',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/title',
      },
      {
        label: 'React <title> component',
        url: 'https://react.dev/reference/react-dom/components/title',
      },
    ],
    related: ['use-page-visibility'],
    concept:
      'An effect writes `document.title` when `title` changes. With `restoreOnUnmount`, an effect declared first captures the current title and restores it in its cleanup.',
    problem:
      'Writing `document.title` during render is a side effect (and crashes on the server); forgetting to restore leaves a stale title after a modal or wizard closes.',
    whenToUse: [
      'Imperative, frequently changing titles (unread counts, timers, upload progress) in client-rendered apps.',
      'Temporary titles that must be restored (a modal editing flow).',
    ],
    whenNotToUse: [
      'Static per-page titles in React 19 — render `<title>` in the component; React hoists it into `<head>`, including during SSR, which this hook cannot do.',
    ],
    api: {
      signature:
        'function useDocumentTitle(title: string, options?: { restoreOnUnmount?: boolean }): void',
      params: [
        { name: 'title', type: 'string', description: 'The title to show.' },
        {
          name: 'options.restoreOnUnmount',
          type: 'boolean',
          description:
            'Restore the title captured when this option became active (normally mount). Default `false`.',
          optional: true,
        },
      ],
      returns: 'Nothing.',
    },
    edgeCases: [
      'Several mounted owners: the last effect to run wins; keep one owner per screen.',
      'Restoring returns the title captured at mount, even if another component changed it since.',
    ],
    testing:
      'Tests assert setting, updating, keeping on unmount by default and restoring the mount-time title.',
  },
  {
    id: 'use-page-visibility',
    title: 'usePageVisibility',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      '`true` while the tab is visible — pause polling, video and animations in the background.',
    tags: ['visibilitychange', 'background tab', 'polling', 'useSyncExternalStore', 'analytics'],
    demo: 'examples/custom-hooks/browser/UsePageVisibilityDemo.tsx',
    sources: ['hooks/browser/usePageVisibility.ts'],
    tests: [
      'hooks/browser/usePageVisibility.test.tsx',
      'examples/custom-hooks/browser/UsePageVisibilityDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: { level: 'universal', notes: '`true` on the server and during hydration.' },
    officialDocs: [
      {
        label: 'MDN: Page Visibility API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API',
      },
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
    ],
    related: ['use-online-status', 'use-event-listener'],
    concept:
      '`useSyncExternalStore` over `document.visibilityState` and the `visibilitychange` event; the snapshot is a boolean.',
    problem:
      'Background tabs keep polling APIs and running expensive work; effect-based visibility state can tear between components.',
    whenToUse: [
      'Pausing polling, carousels, video, WebSocket heartbeats, or "time on page" counters while hidden.',
    ],
    whenNotToUse: [
      'Saving data on exit with `unload`/`beforeunload` — instead flush when the page becomes hidden (`navigator.sendBeacon`).',
    ],
    api: {
      signature: 'function usePageVisibility(): boolean',
      returns: '`true` unless `document.visibilityState === "hidden"`.',
    },
    edgeCases: [
      'Minimised windows and locked screens also report hidden; a window merely behind another window is usually still "visible".',
      'Browsers throttle timers in hidden tabs anyway — but they do not stop network requests.',
    ],
    testing: 'Tests use `setDocumentVisibility()` and assert the listener is removed on unmount.',
  },
  {
    id: 'use-online-status',
    title: 'useOnlineStatus',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      '`navigator.onLine` as tear-free state — remembering that "online" does not prove internet access.',
    tags: ['offline', 'online', 'navigator.onLine', 'useSyncExternalStore', 'PWA'],
    demo: 'examples/custom-hooks/browser/UseOnlineStatusDemo.tsx',
    sources: ['hooks/browser/useOnlineStatus.ts'],
    tests: [
      'hooks/browser/useOnlineStatus.test.tsx',
      'examples/custom-hooks/browser/UseOnlineStatusDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: { level: 'universal', notes: '`true` on the server and during hydration.' },
    officialDocs: [
      {
        label: 'useSyncExternalStore: subscribing to a browser API',
        url: 'https://react.dev/reference/react/useSyncExternalStore#subscribing-to-a-browser-api',
      },
      {
        label: 'MDN: Navigator.onLine',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine',
      },
    ],
    related: ['use-network-information', 'use-page-visibility'],
    concept:
      'Subscribes to `online`/`offline` window events and reads `navigator.onLine` via `useSyncExternalStore` — the example from the React docs with a server snapshot.',
    problem:
      'Effect-based versions render a wrong first value and can tear; reading `navigator` during render breaks SSR.',
    whenToUse: [
      'Offline banners, disabling "Sync now", queueing writes and retrying when the connection returns.',
    ],
    whenNotToUse: [
      'Deciding whether a request will succeed: `onLine === true` only means *a* network connection exists (captive portals, a LAN without upstream or a dead VPN all count). Handle request failures instead; libraries such as TanStack Query already pause and retry on reconnect.',
    ],
    api: {
      signature: 'function useOnlineStatus(): boolean',
      returns: '`navigator.onLine`. `false` is reliable; `true` is a hint.',
    },
    edgeCases: ['Browser DevTools "Offline" throttling toggles the value and fires the events.'],
    testing:
      'Tests flip `navigator.onLine` with `setOnline()` and assert both listeners are removed.',
  },
  {
    id: 'use-clipboard',
    title: 'useClipboard',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'Copy text with "Copied!" feedback that resets itself, error state and secure-context detection; optional read.',
    tags: ['clipboard', 'copy', 'paste', 'writeText', 'readText', 'secure context', 'aria-live'],
    demo: 'examples/custom-hooks/browser/UseClipboardDemo.tsx',
    sources: ['hooks/browser/useClipboard.ts', 'hooks/browser/shared.ts'],
    tests: [
      'hooks/browser/useClipboard.test.tsx',
      'examples/custom-hooks/browser/UseClipboardDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Requires a secure context (HTTPS or localhost). `writeText` works from user gestures in all modern browsers (Safari/Firefox require transient user activation). `readText` prompts: Chromium asks for the `clipboard-read` permission; Safari and Firefox (125+) show a Paste confirmation.',
    },
    officialDocs: [
      {
        label: 'MDN: Clipboard.writeText()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText',
      },
      {
        label: 'MDN: Clipboard.readText()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/readText',
      },
      {
        label: 'MDN: Secure contexts',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts',
      },
    ],
    related: ['use-latest'],
    concept:
      '`copy(text)` calls `navigator.clipboard.writeText`, sets `copied` for `resetAfterMs`, and stores failures in `error`. A call counter makes sure an older, slower promise never overwrites newer state.',
    problem:
      'Copy buttons often throw on HTTP pages (`navigator.clipboard` is `undefined`), leave "Copied!" stuck, leak timers after unmount, or never tell screen-reader users that the copy worked.',
    whenToUse: [
      '"Copy" buttons for code, links, API keys, coupon codes; explicit "Paste" buttons.',
    ],
    whenNotToUse: [
      'Copying rich content (HTML, images) — use `navigator.clipboard.write()` with `ClipboardItem`.',
      'Legacy browsers or insecure origins: the deprecated `document.execCommand("copy")` fallback is intentionally not included.',
    ],
    api: {
      signature:
        'function useClipboard(options?: { resetAfterMs?: number }): { copy(text: string): Promise<boolean>; read(): Promise<string | null>; copied: boolean; error: Error | null; reset(): void; isSupported: boolean; isReadSupported: boolean }',
      params: [
        {
          name: 'options.resetAfterMs',
          type: 'number',
          description: 'How long `copied` stays true. Default `2000`; `0` = until reset.',
          optional: true,
        },
      ],
      returns:
        'Stable `copy`/`read`/`reset` functions, `copied`, `error` and support flags. The promises never reject.',
    },
    mistakes: [
      {
        title: 'Feedback only visual',
        wrong: '<button onClick={() => copy(code)}>{copied ? "✓" : "Copy"}</button>',
        why: 'Screen-reader users get no confirmation that anything happened.',
        right:
          '<button onClick={() => copy(code)}>{copied ? "Copied!" : "Copy"}</button>\n<span role="status" aria-live="polite">{copied ? "Copied to clipboard." : ""}</span>',
      },
    ],
    edgeCases: [
      'Copying when the document is not focused (e.g. from DevTools) fails with `NotAllowedError`.',
      'Permissions Policy can block clipboard access in iframes (`allow="clipboard-write"`).',
    ],
    testing:
      'Tests stub `isSecureContext` and `navigator.clipboard`, use fake timers for the reset, assert the timer is cleared on unmount, out-of-order promises, read errors and the insecure/unsupported paths.',
  },
  {
    id: 'use-geolocation',
    title: 'useGeolocation',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'One-shot or continuous position on request, with loading/error states, permission-denied handling and watch cleanup.',
    tags: ['geolocation', 'GPS', 'location', 'watchPosition', 'permissions', 'privacy'],
    demo: 'examples/custom-hooks/browser/UseGeolocationDemo.tsx',
    sources: ['hooks/browser/useGeolocation.ts', 'hooks/browser/shared.ts'],
    tests: [
      'hooks/browser/useGeolocation.test.tsx',
      'examples/custom-hooks/browser/UseGeolocationDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Available in all modern browsers but only in secure contexts; insecure origins and Permissions Policy report `permission-denied`. Desktop accuracy is often Wi-Fi/IP based.',
    },
    officialDocs: [
      {
        label: 'MDN: Geolocation API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API',
      },
      {
        label: 'MDN: Geolocation.watchPosition()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition',
      },
      {
        label: 'MDN: GeolocationPositionError',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError',
      },
    ],
    related: ['use-online-status'],
    concept:
      'Exposes `getCurrentPosition()`, `watchPosition()` and `clearWatch()` that you call from user actions. Results update `status`, `position` and a normalised `error`; a request counter discards results of superseded requests; the watch is cleared on unmount.',
    problem:
      'Requesting location on mount triggers permission prompts users did not ask for (and browsers penalise that); forgotten `clearWatch` keeps GPS running; raw error codes leak into UI.',
    whenToUse: [
      '"Use my location" buttons, store finders, live tracking a user explicitly started.',
    ],
    whenNotToUse: [
      'Coarse region detection (currency, language) — use server-side IP geolocation or ask the user.',
      'Background tracking — the web platform does not support it.',
    ],
    api: {
      signature:
        "function useGeolocation(options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }): { isSupported: boolean; status: 'idle' | 'loading' | 'success' | 'error'; loading: boolean; position: GeolocationPosition | null; error: { kind: 'permission-denied' | 'position-unavailable' | 'timeout' | 'unsupported'; code: number; message: string } | null; isPermissionDenied: boolean; isWatching: boolean; getCurrentPosition(): void; watchPosition(): void; clearWatch(): void }",
      params: [
        {
          name: 'options',
          type: 'PositionOptions',
          description: 'Read when a request starts (latest values).',
          optional: true,
        },
      ],
      returns: 'State plus stable request functions. Nothing is requested until you call one.',
    },
    execution: [
      'Mount: nothing is requested; only the hydration-safe `isSupported` check runs.',
      '`getCurrentPosition()`: clears any watch, bumps the request id, sets `loading` and calls the API.',
      '`watchPosition()`: stores the watch id; a permission-denied error stops the watch automatically.',
      'Unmount: `clearWatch()` on an active watch.',
    ],
    edgeCases: [
      'A one-shot request cannot be cancelled; its late result is ignored once a newer request or `clearWatch()` happened.',
      'Once denied, browsers do not prompt again — tell users how to re-enable it in site settings.',
      '`timeout` defaults to `Infinity`: set one so the UI cannot stay in `loading` forever.',
    ],
    testing:
      'Tests stub `navigator.geolocation` and drive success/error callbacks manually: nothing on mount, options forwarding, normalised denial, watch clearing on `clearWatch()` and unmount, stale results and the unsupported path.',
    production: [
      'Privacy: ask only for a feature the user requested, explain why, round or truncate coordinates you store, and never send them without consent (GDPR treats location as personal data).',
    ],
  },
  {
    id: 'use-preferred-color-scheme',
    title: 'usePreferredColorScheme',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      "The user's light/dark preference from `prefers-color-scheme`, built on `useMediaQuery`.",
    tags: ['dark mode', 'theme', 'prefers-color-scheme', 'matchMedia'],
    demo: 'examples/custom-hooks/browser/UsePreferredColorSchemeDemo.tsx',
    sources: ['hooks/browser/usePreferredColorScheme.ts', 'hooks/browser/useMediaQuery.ts'],
    tests: [
      'hooks/browser/usePreferredColorScheme.test.tsx',
      'examples/custom-hooks/browser/UsePreferredColorSchemeDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Supported everywhere modern. `no-preference` is only returned when the answer is unknown (server, hydration, no `matchMedia`) — browsers no longer report it.',
    },
    officialDocs: [
      {
        label: 'MDN: prefers-color-scheme',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme',
      },
      {
        label: 'MDN: light-dark()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark',
      },
    ],
    related: ['use-media-query', 'use-reduced-motion', 'use-local-storage'],
    concept:
      'Two `useMediaQuery` subscriptions (`dark` and `light`) combined into `"dark" | "light" | "no-preference"`.',
    problem:
      'Theme code that reads `matchMedia` during render breaks SSR, and code that reads it once ignores the user switching the OS theme in the evening.',
    whenToUse: [
      'JavaScript decisions: picking a chart palette, a syntax-highlighting theme or a map style.',
      'Resolving a "system" option in a user-selectable theme (persist the explicit choice with `useLocalStorage`).',
    ],
    whenNotToUse: [
      'Styling — `@media (prefers-color-scheme)`, `color-scheme` and `light-dark()` work before JavaScript runs and avoid a flash.',
    ],
    api: {
      signature: "function usePreferredColorScheme(): 'light' | 'dark' | 'no-preference'",
      returns: "`'dark'`, `'light'`, or `'no-preference'` when unknown.",
    },
    edgeCases: [
      'Server render returns `no-preference`; render neutral or CSS-driven output first to avoid a hydration flash.',
    ],
    testing: 'Tests flip both queries with `installMatchMedia()` and check the unknown fallback.',
  },
  {
    id: 'use-reduced-motion',
    title: 'useReducedMotion',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'beginner',
    summary:
      '`true` when the user asked to minimise motion — switch off JS-driven animation and autoplay.',
    tags: ['prefers-reduced-motion', 'accessibility', 'animation', 'autoplay', 'vestibular'],
    demo: 'examples/custom-hooks/browser/UsePreferredColorSchemeDemo.tsx',
    sources: ['hooks/browser/useReducedMotion.ts', 'hooks/browser/useMediaQuery.ts'],
    tests: [
      'hooks/browser/usePreferredColorScheme.test.tsx',
      'examples/custom-hooks/browser/UsePreferredColorSchemeDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes: '`defaultValue` (default `false`) on the server and without `matchMedia`.',
    },
    officialDocs: [
      {
        label: 'MDN: prefers-reduced-motion',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion',
      },
      {
        label: 'WCAG 2.2: Animation from Interactions',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html',
      },
    ],
    related: ['use-media-query', 'use-preferred-color-scheme', 'use-scroll-position'],
    concept:
      '`useMediaQuery("(prefers-reduced-motion: reduce)")` with a configurable server default.',
    problem:
      'CSS media queries cannot reach animations driven from JavaScript: `scrollIntoView({ behavior: "smooth" })`, animated counters, autoplaying carousels, canvas/WebGL effects.',
    whenToUse: [
      'Choosing `behavior: "auto"` instead of `"smooth"`, disabling autoplay, replacing movement with cross-fades.',
    ],
    whenNotToUse: ['CSS animations and transitions — handle them with the media query in CSS.'],
    api: {
      signature: 'function useReducedMotion(options?: { defaultValue?: boolean }): boolean',
      params: [
        {
          name: 'options.defaultValue',
          type: 'boolean',
          description: 'Server/unsupported value. Default `false`.',
          optional: true,
        },
      ],
      returns: '`true` when reduced motion is requested.',
    },
    edgeCases: [
      'Reduced motion is not "no motion": keep small feedback animations that aid understanding.',
      'Autoplaying content still needs a pause control for everyone else (WCAG 2.2.2).',
    ],
    testing: 'Tests flip the query with `installMatchMedia()` and cover `defaultValue`.',
  },
  {
    id: 'use-network-information',
    title: 'useNetworkInformation',
    section: 'custom',
    category: 'Browser & DOM',
    level: 'intermediate',
    summary:
      'Connection hints (`effectiveType`, `downlink`, `rtt`, `saveData`) from `navigator.connection` — Chromium only.',
    tags: [
      'Network Information API',
      'navigator.connection',
      'saveData',
      'effectiveType',
      'adaptive loading',
    ],
    demo: 'examples/custom-hooks/browser/UseOnlineStatusDemo.tsx',
    sources: ['hooks/browser/useNetworkInformation.ts'],
    tests: [
      'hooks/browser/useNetworkInformation.test.tsx',
      'examples/custom-hooks/browser/UseOnlineStatusDemo.test.tsx',
      'hooks/browser/browser.ssr.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Chromium-based browsers only (Chrome, Edge, Opera, Samsung Internet). Not implemented in Firefox or Safari: `isSupported` is `false` and all fields are `undefined`. `type` is only exposed on Android/ChromeOS.',
    },
    officialDocs: [
      {
        label: 'MDN: Network Information API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API',
      },
      {
        label: 'MDN: NetworkInformation.effectiveType',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType',
      },
    ],
    related: ['use-online-status'],
    concept:
      '`useSyncExternalStore` over `navigator.connection` and its `change` event; the snapshot object is cached and replaced only when a field changes.',
    problem:
      'Reading `navigator.connection` directly crashes TypeScript builds (it is not in `lib.dom`), returns `undefined` in half the browsers and never updates.',
    whenToUse: [
      'Progressive enhancement: lower-resolution media or no autoplay when `saveData` is on or `effectiveType` is `2g`.',
    ],
    whenNotToUse: [
      'Anything that must work cross-browser — treat the values as optional hints.',
      'Measuring real throughput — the values are coarse, rounded and capped by the browser to limit fingerprinting.',
      'Offline detection — use `useOnlineStatus`.',
    ],
    api: {
      signature:
        "function useNetworkInformation(): { isSupported: boolean; effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'; downlink?: number; rtt?: number; saveData?: boolean; type?: string }",
      returns:
        'A stable snapshot object; `{ isSupported: false }` on the server and in Firefox/Safari.',
    },
    edgeCases: [
      '`effectiveType` is derived from recently observed rtt/downlink, not from the physical connection type.',
      'The `Save-Data` request header carries the same preference to your server.',
    ],
    testing:
      'Tests install a fake `navigator.connection` (an `EventTarget`), assert snapshot identity, updates on `change`, listener removal and the unsupported path.',
  },
];
