import type { CatalogEntry } from '../types';

const CATEGORY = 'Device & preferences';

const USE_SYNC_EXTERNAL_STORE = {
  label: 'useSyncExternalStore',
  url: 'https://react.dev/reference/react/useSyncExternalStore',
};

export const entries: CatalogEntry[] = [
  {
    id: 'use-orientation',
    title: 'useOrientation',
    section: 'custom',
    category: CATEGORY,
    level: 'beginner',
    summary:
      'Screen orientation type and angle from the Screen Orientation API, with a media-query fallback.',
    tags: ['orientation', 'screen.orientation', 'portrait', 'landscape', 'mobile', 'matchMedia'],
    demo: 'examples/custom-hooks/device/UseOrientationDemo.tsx',
    sources: ['hooks/device/useOrientation.ts'],
    tests: [
      'hooks/device/useOrientation.test.tsx',
      'hooks/device/device.ssr.test.tsx',
      'examples/custom-hooks/device/DeviceDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        '`screen.orientation` is in every current engine (Safari since 16.4). Older browsers use the `(orientation: portrait)` media query, which has no angle. Server: `source: "none"`.',
    },
    officialDocs: [
      {
        label: 'MDN: Screen Orientation API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API',
      },
      USE_SYNC_EXTERNAL_STORE,
    ],
    related: ['use-media-query', 'use-device-pixel-ratio'],
    concept:
      'Subscribes to `screen.orientation`’s `change` event through `useSyncExternalStore` and returns `{ type, angle, isPortrait, isLandscape, source, isSupported }`.',
    problem:
      'Orientation-specific behaviour (a camera UI, a game, a chart that needs width) needs a live value; hand-written `orientationchange` listeners use a deprecated event and `window.orientation`, which is non-standard.',
    whenToUse: [
      'Behaviour that depends on device rotation: showing a “rotate your device” hint, switching a media player layout.',
      'Reading the rotation angle (0/90/180/270) for camera or canvas work.',
    ],
    whenNotToUse: [
      'Pure layout changes — use CSS `@media (orientation: …)` or container queries.',
      'Locking orientation: `screen.orientation.lock()` only works in fullscreen on some mobile browsers and is intentionally not wrapped.',
    ],
    api: {
      signature: 'function useOrientation(): OrientationState',
      returns:
        '`{ isSupported, source: "screen-orientation" | "media-query" | "none", type: OrientationType | null, angle: number | null, isPortrait, isLandscape }`.',
    },
    execution: [
      'Render: three `useSyncExternalStore` reads (source, type, angle) — primitives, so no snapshot caching is needed.',
      'Commit: React subscribes once per read to `screen.orientation` `change` (or the media query `change`).',
      'Rotation: the event fires, React re-reads the snapshots and re-renders if they changed.',
      'Unmount: listeners are removed.',
    ],
    edgeCases: [
      'Media-query fallback compares the *viewport* aspect ratio: a narrow desktop window reports portrait.',
      'iPadOS in split view can report a different orientation from the physical device.',
    ],
    testing:
      'Tests install a fake `screen.orientation` (an `EventTarget`) and the `matchMedia` fake, rotate, and assert listener cleanup; the SSR test renders the server defaults.',
  },
  {
    id: 'use-vibration',
    title: 'useVibration',
    section: 'custom',
    category: CATEGORY,
    level: 'beginner',
    summary:
      'Haptic feedback with `navigator.vibrate` — feature-detected, cancellable, cleaned up.',
    tags: ['vibration', 'haptics', 'navigator.vibrate', 'mobile', 'user activation'],
    demo: 'examples/custom-hooks/device/UseVibrationDemo.tsx',
    sources: ['hooks/device/useVibration.ts'],
    tests: [
      'hooks/device/useVibration.test.tsx',
      'examples/custom-hooks/device/DeviceDemos.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'browser-limited',
      notes:
        'Chromium-based browsers on Android. Safari (iOS/macOS) never supported it, so `isSupported` is `false` there. Desktop hardware usually has no motor.',
    },
    officialDocs: [
      {
        label: 'MDN: Vibration API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API',
      },
      {
        label: 'MDN: User activation',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation',
      },
    ],
    related: ['use-speech-synthesis'],
    concept:
      'Calls `navigator.vibrate(pattern)`, tracks `isVibrating` for the pattern’s total duration, and stops the pattern with `vibrate(0)` on `cancel()` or unmount.',
    problem:
      'Calling `navigator.vibrate` unguarded throws on iOS, and patterns keep buzzing after the component that started them is gone.',
    whenToUse: [
      'Optional tactile confirmation on mobile: a long-press menu opening, a scanner success.',
    ],
    whenNotToUse: [
      'As the only feedback channel — many users (and all iPhones) will never feel it.',
      'On page load: Chromium blocks vibration until the user has interacted with the page.',
    ],
    api: {
      signature: 'function useVibration(): VibrationControls',
      returns:
        '`{ isSupported, isVibrating, vibrate(pattern: number | readonly number[]): boolean, cancel(): void }`. `vibrate` returns the browser’s answer (`false` when unsupported, invalid or blocked).',
    },
    mistakes: [
      {
        title: 'Vibrating without feature detection',
        wrong: 'navigator.vibrate(200);',
        why: '`navigator.vibrate` is undefined in Safari, so this throws a TypeError there.',
        right: 'const { isSupported, vibrate } = useVibration();\nif (isSupported) vibrate(200);',
      },
    ],
    edgeCases: [
      'A new pattern replaces the one playing (spec behaviour); the internal timer is restarted.',
      '`isVibrating` is an estimate from the pattern length — the API has no “ended” event.',
    ],
    testing:
      'Tests stub `navigator.vibrate` with `overrideProperty`, use fake timers for `isVibrating`, and assert `vibrate(0)` plus no pending timers after unmount.',
  },
  {
    id: 'use-battery',
    title: 'useBattery',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Battery level and charging state from `navigator.getBattery()` — Chromium-only, with a privacy warning.',
    tags: ['battery', 'getBattery', 'BatteryManager', 'fingerprinting', 'privacy', 'compatibility'],
    demo: 'examples/custom-hooks/device/UseBatteryDemo.tsx',
    sources: ['hooks/device/useBattery.ts', 'hooks/device/support.ts'],
    tests: [
      'hooks/device/useBattery.test.tsx',
      'hooks/device/device.ssr.test.tsx',
      'examples/custom-hooks/device/DeviceDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Chromium-based browsers in secure contexts only. Firefox removed the API over fingerprinting concerns; Safari never shipped it. Can be blocked by the `battery` Permissions-Policy.',
    },
    officialDocs: [
      {
        label: 'MDN: Battery Status API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API',
      },
    ],
    related: ['use-network-information', 'use-page-visibility'],
    concept:
      'Resolves `navigator.getBattery()` after mount, copies `level`, `charging`, `chargingTime` and `dischargingTime` into state and updates on the four `*change` events.',
    problem:
      'The API is promise-based and event-driven: naive versions set state after unmount, leak listeners, and crash in the majority of browsers where it does not exist.',
    whenToUse: [
      'Progressive enhancement: reduce animation, pause autoplay or postpone a large sync when the battery is low and not charging.',
    ],
    whenNotToUse: [
      'Any feature that must work everywhere — most users’ browsers do not expose this API.',
      'Analytics or identification: precise battery readings were used to fingerprint users, which is why Firefox removed the API.',
    ],
    api: {
      signature: 'function useBattery(): BatteryState',
      returns:
        '`{ isSupported, loading, battery: { level, charging, chargingTime, dischargingTime } | null, error: Error | null }`. Times are seconds (`Infinity` when unknown).',
    },
    execution: [
      'Render: `isSupported` comes from `useSyncExternalStore` (server/hydration: `false`); `loading` is derived.',
      'Effect: `getBattery()` is called once; a `cancelled` flag guards against unmount before it resolves.',
      'Resolved: listeners for `levelchange`, `chargingchange`, `chargingtimechange`, `dischargingtimechange` are attached and the first snapshot stored.',
      'Cleanup: all four listeners are removed.',
    ],
    edgeCases: [
      'Unmount before the promise resolves → nothing is subscribed.',
      'Rejection (e.g. `SecurityError` from a Permissions-Policy in an iframe) → `error`.',
      'Desktop without a battery typically reports `level: 1`, `charging: true`.',
    ],
    testing:
      'A fake `BatteryManager` (an `EventTarget`) is installed on `navigator`; tests cover loading, change events, listener cleanup, unmount-before-resolve and rejection.',
    production: [
      'Treat the values as hints and keep sensible behaviour when `isSupported` is `false`.',
    ],
  },
  {
    id: 'use-pointer-position',
    title: 'usePointerPosition',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Pointer coordinates over the window or an element, throttled to one update per animation frame.',
    tags: ['pointer', 'mouse', 'touch', 'pen', 'requestAnimationFrame', 'throttle', 'coordinates'],
    demo: 'examples/custom-hooks/device/UsePointerPositionDemo.tsx',
    sources: ['hooks/device/usePointerPosition.ts'],
    tests: [
      'hooks/device/usePointerPosition.test.tsx',
      'examples/custom-hooks/device/DeviceDemos.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'client-only',
      notes: 'Returns `null` on the server and until the first move.',
    },
    officialDocs: [
      {
        label: 'MDN: Pointer events',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events',
      },
      {
        label: 'MDN: requestAnimationFrame',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame',
      },
    ],
    related: ['use-event-listener', 'use-animation-frame'],
    concept:
      'A passive `pointermove` listener stores the latest event; a single `requestAnimationFrame` per frame turns it into `{ clientX, clientY, x, y, ratioX, ratioY, pointerType }`.',
    problem:
      '`setState` on every `pointermove` can mean hundreds of renders per second — more than the screen can display — and janky interactions.',
    whenToUse: [
      'Cursor-following UI, custom crosshairs, parallax, drawing previews, tooltips that follow the pointer.',
    ],
    whenNotToUse: [
      'Purely visual following effects with no React state needed — write to a DOM style in the listener (or a CSS variable) and skip React renders entirely.',
      'Drag-and-drop with pointer capture — use a dedicated library or `setPointerCapture` handlers.',
    ],
    api: {
      signature:
        'function usePointerPosition(options?: { target?: RefObject<HTMLElement | null>; enabled?: boolean }): PointerPosition | null',
      params: [
        {
          name: 'options.target',
          type: 'RefObject<HTMLElement | null>',
          description:
            'Track inside this element (coordinates relative to it; resets on `pointerleave`). Default: window.',
          optional: true,
        },
        {
          name: 'options.enabled',
          type: 'boolean',
          description: 'Pause tracking (default `true`). The last value is kept.',
          optional: true,
        },
      ],
      returns: '`null` until the first move, then the latest position.',
    },
    execution: [
      'Effect: resolves the target (ref is read after commit) and adds a passive `pointermove` listener.',
      'Event: stores the event; schedules one rAF if none is pending.',
      'Frame: reads `getBoundingClientRect()` once and commits one state update.',
      'Cleanup: removes listeners and cancels a pending frame.',
    ],
    mistakes: [
      {
        title: 'Rendering on every event',
        wrong:
          "useEffect(() => {\n  const onMove = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });\n  window.addEventListener('pointermove', onMove);\n  return () => window.removeEventListener('pointermove', onMove);\n}, []);",
        why: 'High-frequency pointers (and 120 Hz displays) trigger far more renders than frames.',
      },
    ],
    edgeCases: [
      'Touch only produces moves while the finger is down, and scrolling may claim the gesture — set `touch-action: none` on the element.',
      'A ref target that mounts later is attached when `enabled` or `target` changes.',
    ],
    testing:
      'Fake timers drive `requestAnimationFrame`; a test fires 20 moves and asserts exactly one extra render, and that a pending frame is cancelled on unmount.',
  },
  {
    id: 'use-device-pixel-ratio',
    title: 'useDevicePixelRatio',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary:
      'Live `devicePixelRatio` using the `(resolution: Xdppx)` media-query re-subscription trick.',
    tags: ['devicePixelRatio', 'dppx', 'zoom', 'hidpi', 'retina', 'canvas', 'matchMedia'],
    demo: 'examples/custom-hooks/device/UseDevicePixelRatioDemo.tsx',
    sources: ['hooks/device/useDevicePixelRatio.ts'],
    tests: [
      'hooks/device/useDevicePixelRatio.test.tsx',
      'hooks/device/device.ssr.test.tsx',
      'examples/custom-hooks/device/DeviceDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Server and hydration render `defaultValue` (1). Without `matchMedia` it listens to `resize`.',
    },
    officialDocs: [
      {
        label: 'MDN: devicePixelRatio (monitoring changes)',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio',
      },
      USE_SYNC_EXTERNAL_STORE,
    ],
    related: ['use-media-query', 'use-orientation', 'use-ref-canvas'],
    concept:
      'Subscribes to `matchMedia("(resolution: <current>dppx)")`. When that query stops matching, the ratio changed: the hook moves its listener to a query for the new ratio and notifies React.',
    problem:
      'There is no `devicepixelratiochange` event, so canvases and image pickers silently go blurry after browser zoom or after moving the window to another monitor.',
    whenToUse: [
      'Sizing a `<canvas>` backing store (`width = cssWidth * dpr`).',
      'Choosing image or tile density in JavaScript (maps, charts, WebGL).',
    ],
    whenNotToUse: [
      'Responsive images in markup — `srcset`/`<picture>` already pick the right density without JavaScript.',
    ],
    api: {
      signature: 'function useDevicePixelRatio(options?: { defaultValue?: number }): number',
      params: [
        {
          name: 'options.defaultValue',
          type: 'number',
          description:
            'Server/hydration value and fallback when the browser reports 0. Default `1`.',
          optional: true,
        },
      ],
      returns: 'The current ratio, e.g. `1`, `1.25`, `2`.',
    },
    execution: [
      'Subscribe: create the query for the current ratio and listen for `change`.',
      'Change: remove that listener, listen on a query for the new ratio, then call React’s `onChange`.',
      'Snapshot: `window.devicePixelRatio` (a number, compared with `Object.is`).',
      'Unsubscribe: removes whichever listener is current.',
    ],
    edgeCases: [
      'Fractional ratios (1.25, 1.5 on Windows) produce queries like `(resolution: 1.25dppx)`, which work fine.',
      'Pinch-zoom on mobile does not change `devicePixelRatio`; browser zoom does.',
    ],
    testing:
      'A custom `matchMedia` fake counts listeners per query to prove the listener moves from `1dppx` to `2dppx` and nothing remains after unmount; a separate test covers the `resize` fallback.',
    diagram: {
      title: 'Re-subscribing on every ratio change',
      description: 'Each change moves the listener to a query for the new ratio.',
      mermaid: `sequenceDiagram
  participant H as useDevicePixelRatio
  participant MQ1 as matchMedia 1dppx
  participant MQ2 as matchMedia 2dppx
  participant R as React
  H->>MQ1: addEventListener change
  Note over MQ1: user zooms to 200 percent
  MQ1-->>H: change event
  H->>MQ1: removeEventListener
  H->>MQ2: addEventListener change
  H->>R: onChange
  R->>H: getSnapshot returns 2`,
    },
  },
  {
    id: 'use-speech-recognition',
    title: 'useSpeechRecognition',
    section: 'custom',
    category: CATEGORY,
    level: 'advanced',
    summary:
      'Speech-to-text with the Web Speech API: start/stop/abort, interim results, error states, mic permission on demand.',
    tags: [
      'speech recognition',
      'webkitSpeechRecognition',
      'voice input',
      'dictation',
      'microphone',
      'privacy',
    ],
    demo: 'examples/custom-hooks/device/UseSpeechRecognitionDemo.tsx',
    sources: ['hooks/device/useSpeechRecognition.ts'],
    tests: [
      'hooks/device/useSpeechRecognition.test.tsx',
      'hooks/device/device.ssr.test.tsx',
      'examples/custom-hooks/device/DeviceDemos.test.tsx',
    ],
    minReact: '16.8',
    support: {
      level: 'browser-limited',
      notes:
        'Chromium-based browsers and Safari (prefixed `webkitSpeechRecognition`); not Firefox. Needs a secure context and microphone permission.',
    },
    officialDocs: [
      {
        label: 'MDN: Using the Web Speech API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API',
      },
      {
        label: 'MDN: SpeechRecognition',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition',
      },
    ],
    related: ['use-speech-synthesis', 'use-permission'],
    concept:
      'Creates a `SpeechRecognition` instance on `start()`, maps its `start`/`result`/`error`/`end` events onto a reducer (`status`, `transcript`, `interimTranscript`, `error`) and aborts it on unmount.',
    problem:
      'The API is event-heavy and stateful: calling `start()` twice throws, `abort()` reports an `aborted` “error”, interim and final results arrive in one list, and forgetting to abort keeps the microphone open after navigation.',
    whenToUse: ['Optional voice input next to a text field: search, notes, accessibility helpers.'],
    whenNotToUse: [
      'Sensitive input (passwords, health data): Chrome streams audio to a server-based recognition service.',
      'As the only input method — Firefox has no support; always keep a keyboard path.',
      'Offline or high-accuracy transcription — use a dedicated speech service with explicit consent.',
    ],
    api: {
      signature:
        'function useSpeechRecognition(options?: { lang?: string; continuous?: boolean; interimResults?: boolean; onResult?: (result) => void }): SpeechRecognitionControls',
      params: [
        {
          name: 'options.lang',
          type: 'string',
          description: 'BCP 47 tag. Defaults to `<html lang>`.',
          optional: true,
        },
        {
          name: 'options.continuous',
          type: 'boolean',
          description: 'Keep listening across pauses. Default `false`.',
          optional: true,
        },
        {
          name: 'options.interimResults',
          type: 'boolean',
          description: 'Report partial results. Default `true`.',
          optional: true,
        },
        {
          name: 'options.onResult',
          type: '({ transcript, confidence, isFinal }) => void',
          description: 'Called for every result; always the latest callback.',
          optional: true,
        },
      ],
      returns:
        '`{ isSupported, status: "idle" | "starting" | "listening" | "stopping", listening, transcript, interimTranscript, error: { code, message } | null, start, stop, abort, reset }`.',
    },
    execution: [
      'Mount: nothing is created and no permission is requested.',
      '`start()` (from a click): a new instance is configured from the latest options and started; the browser may prompt for the microphone.',
      'Events: `start` → listening; `result` → final text appended, interim replaced; `error` → `error` (except `aborted`); `end` → idle and listeners detached.',
      'Unmount: listeners are detached and the session is aborted.',
    ],
    mistakes: [
      {
        title: 'Starting on mount',
        wrong: 'useEffect(() => {\n  recognition.start();\n}, []);',
        why: 'The permission prompt appears without context (users tend to deny it), and with no cleanup the Strict Mode remount calls `start()` on a running session, which throws `InvalidStateError`.',
        right: '<button onClick={speech.start}>Start dictation</button>',
      },
    ],
    edgeCases: [
      '`not-allowed` covers both a denied prompt and an insecure (http) page.',
      '`no-speech` fires after a few seconds of silence; `network` when Chrome’s service is unreachable.',
      'Option changes apply to the next `start()`, not the running session.',
    ],
    testing:
      'A `FakeRecognition` class (an `EventTarget`) is stubbed on `window`; tests dispatch result/error/end events and cover webkit detection, the `aborted` non-error, `start()` throwing, and abort + listener removal on unmount.',
    production: [
      'Tell users, before they press Start, where their audio goes.',
      'Show the interim transcript visually distinct and only act on final results.',
    ],
    diagram: {
      title: 'Recognition lifecycle',
      description: 'Status transitions driven by user actions and browser events.',
      mermaid: `stateDiagram-v2
  [*] --> idle
  idle --> starting: start()
  starting --> listening: start event
  listening --> stopping: stop() or abort()
  starting --> idle: start() throws
  listening --> idle: end event
  stopping --> idle: end event`,
    },
  },
  {
    id: 'use-speech-synthesis',
    title: 'useSpeechSynthesis',
    section: 'custom',
    category: CATEGORY,
    level: 'intermediate',
    summary: 'Text-to-speech: async voice loading, speak/pause/resume/cancel and speaking state.',
    tags: ['speech synthesis', 'text to speech', 'tts', 'voices', 'voiceschanged', 'accessibility'],
    demo: 'examples/custom-hooks/device/UseSpeechSynthesisDemo.tsx',
    sources: ['hooks/device/useSpeechSynthesis.ts'],
    tests: [
      'hooks/device/useSpeechSynthesis.test.tsx',
      'hooks/device/device.ssr.test.tsx',
      'examples/custom-hooks/device/DeviceDemos.test.tsx',
    ],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'Available in all modern browsers; voices depend on the OS. Chromium only speaks after a user gesture.',
    },
    officialDocs: [
      {
        label: 'MDN: SpeechSynthesis',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis',
      },
      {
        label: 'MDN: voiceschanged event',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event',
      },
    ],
    related: ['use-speech-recognition', 'use-vibration'],
    concept:
      'Reads `speechSynthesis.getVoices()` through `useSyncExternalStore` (re-read on `voiceschanged`, cached by voice URI) and tracks `speaking`/`paused` from the events of the utterances it creates.',
    problem:
      '`getVoices()` is empty on first call in Chromium, returns a new array each time (an infinite-loop trap for `useSyncExternalStore`), and the global queue keeps talking after the component unmounts.',
    whenToUse: [
      'Reading content aloud on request, spoken feedback in hands-free flows, language-learning apps.',
    ],
    whenNotToUse: [
      'Replacing screen readers — users who need them already have one configured; use ARIA live regions for announcements instead.',
      'Consistent branded voice output — voices vary per OS/browser; use a server TTS service.',
    ],
    api: {
      signature: 'function useSpeechSynthesis(): SpeechSynthesisControls',
      returns:
        '`{ isSupported, voices, speaking, paused, error, speak(text, { voice, lang, rate, pitch, volume, queue }), cancel, pause, resume }`. `speak` interrupts current speech unless `queue: true`.',
    },
    execution: [
      'Render: `voices` from `useSyncExternalStore`; the snapshot is replaced only when the list of voice URIs changes.',
      '`speak()`: optionally `cancel()`s, creates an utterance with event handlers, keeps it in a ref (prevents a Chromium GC bug) and queues it.',
      'Utterance events update `speaking`/`paused`; `interrupted`/`canceled` errors are not reported as failures.',
      'Unmount: if this hook has utterances in flight, `speechSynthesis.cancel()` runs.',
    ],
    edgeCases: [
      '`cancel()` is page-wide: it also stops speech started by other components.',
      'Chromium may stop long utterances after ~15 s on some platforms; split long text into sentences.',
      'Without a prior user gesture Chromium fails with `not-allowed`.',
    ],
    testing:
      'A fake `speechSynthesis` (an `EventTarget`) and utterance class are stubbed; tests cover voice loading via `voiceschanged`, stable voice arrays, options, pause/resume, error filtering and cancel-on-unmount.',
  },
];
