import type { CatalogEntry } from '../types';

const SCENARIOS = 'examples/scenarios';

const USE_SYNC_EXTERNAL_STORE_DOCS = {
  label: 'useSyncExternalStore',
  url: 'https://react.dev/reference/react/useSyncExternalStore',
};
const ABORT_DOCS = {
  label: 'MDN: AbortController',
  url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
};
const LIVE_REGION_DOCS = {
  label: 'MDN: ARIA live regions',
  url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions',
};

export const entries: CatalogEntry[] = [
  // ---------------------------------------------------------------------
  {
    id: 'undo-redo-editor',
    title: 'Undo/redo note editor',
    section: 'scenario',
    category: 'Editing & interaction',
    level: 'intermediate',
    summary:
      'A note editor with coalesced typing history, scoped Ctrl/⌘+Z · Shift+Ctrl/⌘+Z · Ctrl+Y shortcuts and a clickable history panel.',
    tags: ['undo', 'redo', 'history', 'keyboard shortcuts', 'coalescing', 'editor', 'markdown'],
    demo: `${SCENARIOS}/undo-redo-editor/UndoRedoEditorScenario.tsx`,
    sources: [
      `${SCENARIOS}/undo-redo-editor/UndoRedoEditorScenario.tsx`,
      `${SCENARIOS}/undo-redo-editor/editorText.ts`,
      `${SCENARIOS}/undo-redo-editor/MarkdownPreview.tsx`,
      'hooks/state/useUndoRedo.ts',
      'hooks/accessibility/useKeyboardShortcut.ts',
    ],
    tests: [`${SCENARIOS}/undo-redo-editor/UndoRedoEditorScenario.test.tsx`],
    minReact: '18.0',
    officialDocs: [
      { label: 'useReducer', url: 'https://react.dev/reference/react/useReducer' },
      {
        label: 'MDN: aria-keyshortcuts',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-keyshortcuts',
      },
    ],
    related: [
      'use-undo-redo',
      'use-keyboard-shortcut',
      'undo-redo-reducer-enhancer',
      'use-reducer',
    ],
    concept:
      'The whole document (`{ title, body, label }`) is one immutable snapshot managed by `useUndoRedo`. Typing calls `set(updater, { coalesceKey })`, so a burst of keystrokes in one field becomes a single undo step; toolbar commands (bold, heading, bullet) are discrete steps. `useKeyboardShortcut` binds the platform shortcuts on the editor region only.',
    problem:
      'Per-keystroke history makes undo useless, a window-level Ctrl+Z listener breaks native undo in every other input on the page, and controlled textareas lose the browser’s own undo stack — so an editor needs an explicit, well-shaped history.',
    whenToUse: [
      'Forms, note editors, canvases and configuration screens where users experiment and need to step back.',
      'Any state that can be stored as immutable snapshots of moderate size.',
    ],
    whenNotToUse: [
      'Large documents or collaborative editing: store operations/patches (or use a CRDT such as Yjs) instead of full snapshots.',
      'Rich text: editors like ProseMirror, Lexical or Slate ship their own transaction-based history.',
    ],
    execution: [
      'Render: `present` feeds the fields and the preview; `past`/`present`/`future` render the history panel.',
      'Typing: `set((prev) => ({ ...prev, body }), { coalesceKey: "body" })` — within 800 ms of the previous body edit the reducer replaces `present` instead of pushing to `past`.',
      'A toolbar command reads the textarea selection in the click handler, computes the new text with a pure helper, stores the wanted selection in a ref and calls `set` without a key.',
      'Layout effect after the new `present` commits: the pending selection is restored before paint.',
      'Keydown inside the editor region: `mod+z` → `undo`, `mod+shift+z` (and `ctrl+y` off Apple platforms) → `redo`, with `preventDefault` so the browser does not apply its own undo.',
      'History panel: jumping to step *n* dispatches the required number of `undo`/`redo` actions.',
    ],
    edgeCases: [
      'Ctrl+Z in the “Scratch pad” outside the editor keeps native undo (the listener is scoped to the editor element, not `window`).',
      'Switching fields or pausing longer than the coalescing window starts a new step; a new edit after undo discards the redo stack.',
      'The platform is read with `useSyncExternalStore` (server: `false`), so shortcut labels never cause a hydration mismatch.',
      'IME composition keystrokes are ignored by `useKeyboardShortcut`.',
      'Undo moves the caret to the end of the textarea (only toolbar commands restore a selection).',
      'History is capped at 100 steps (`limit`).',
    ],
    testing:
      'Tests type with user-event and assert one coalesced step per burst, a new step after a pause (only `Date` faked so user-event keeps working), redo via both shortcuts, the redo stack being cleared, shortcuts *not* firing (or preventing default) in the outside input, toolbar commands with selection restore, history jumps and reset. Pure helpers are unit-tested.',
    production: [
      'Persist history only if users expect it (e.g. drafts); otherwise memory-only history is the norm.',
      'Coalesce by word or line boundaries for finer steps (e.g. include the line number in `coalesceKey`).',
      'Mark shortcuts with `aria-keyshortcuts` and list them in a help dialog.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'sortable-drag-and-drop',
    title: 'Drag-and-drop reordering (pointer + keyboard)',
    section: 'scenario',
    category: 'Editing & interaction',
    level: 'advanced',
    summary:
      'A sortable list driven by Pointer Events, with a complete keyboard mode, single-click move buttons, live-region announcements and reduced-motion support.',
    tags: [
      'drag and drop',
      'sortable',
      'reorder',
      'pointer events',
      'touch',
      'keyboard',
      'aria-live',
      'prefers-reduced-motion',
      'WCAG 2.5.7',
    ],
    demo: `${SCENARIOS}/drag-and-drop/DragAndDropScenario.tsx`,
    sources: [
      `${SCENARIOS}/drag-and-drop/DragAndDropScenario.tsx`,
      `${SCENARIOS}/drag-and-drop/reorder.ts`,
      `${SCENARIOS}/drag-and-drop/DragAndDropScenario.css`,
      'hooks/accessibility/useAnnouncer.ts',
      'hooks/browser/useReducedMotion.ts',
      'hooks/accessibility/useKeyboardShortcut.ts',
    ],
    tests: [`${SCENARIOS}/drag-and-drop/DragAndDropScenario.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'universal',
      notes:
        'Pointer Events and `setPointerCapture` are supported by every current browser; touch needs `touch-action: none` on the handle.',
    },
    officialDocs: [
      {
        label: 'MDN: Pointer events',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events',
      },
      {
        label: 'MDN: setPointerCapture',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture',
      },
      {
        label: 'WCAG 2.2: Dragging Movements (2.5.7)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html',
      },
      {
        label: 'React Aria: drag and drop',
        url: 'https://react-spectrum.adobe.com/react-aria/dnd.html',
      },
    ],
    related: [
      'use-announcer',
      'use-reduced-motion',
      'use-keyboard-shortcut',
      'use-pointer-position',
    ],
    concept:
      'On `pointerdown` the handle captures the pointer and the item rectangles are measured once. Moves translate the dragged item with the pointer and compute the drop index from the measured midpoints; neighbours slide by the dragged height + gap. Keyboard users grab with Space/Enter, move with arrows/Home/End, drop with Space/Enter (or Tab) and cancel with Escape. Every change is announced through `useAnnouncer`.',
    problem:
      'The HTML5 drag-and-drop API does not work on most touch screens, cannot be styled during the drag and has no keyboard equivalent, so a drag-only list excludes touch, keyboard and screen-reader users (and fails WCAG 2.5.7).',
    whenToUse: [
      'Reordering short lists: priorities, playlists, form builder fields, kanban columns.',
      'When you need one interaction model for mouse, pen and touch.',
    ],
    whenNotToUse: [
      'Complex boards (multiple containers, auto-scroll, virtualised lists): use dnd-kit or React Aria’s drag-and-drop, which handle collision detection, scrolling and announcements.',
      'Dragging files from the OS: only the native drag-and-drop API receives them (see the file upload scenario).',
    ],
    execution: [
      '`pointerdown` (primary button only): measure rects, `setPointerCapture`, store `{ from, to, startY, midpoints, distance }`.',
      '`pointermove` for the captured pointer: `dy = clientY - startY`, `to = computeDropIndex(midpoints, from, center)`; render transforms only.',
      '`pointerup`: commit `moveItem(from, to)` and announce the final position; `pointercancel`, lost capture or Escape restore the original order.',
      'Keyboard: Space/Enter stores the original order and announces the instructions; arrows reorder the array live; a layout effect re-focuses the moved handle and scrolls it into view (`smooth` unless reduced motion).',
      'Reduced motion (`useReducedMotion`): neighbours jump into place instead of sliding.',
    ],
    edgeCases: [
      'A second pointer (multi-touch) or a secondary mouse button is ignored.',
      'Moving past the first/last position announces “already at the top/bottom” instead of failing silently.',
      'Tab while holding an item drops it, so keyboard users never get stuck in a mode.',
      'The list does not auto-scroll during a pointer drag (keep lists short, or use a library).',
      'Move buttons are disabled during a drag to avoid two concurrent reorder sources.',
    ],
    testing:
      'jsdom has no layout, so the test stubs `getBoundingClientRect` per item and drives `pointerdown/move/up` with `fireEvent`, asserting neighbour transforms, the final order and the announcement. Keyboard tests cover grab, move, focus retention, drop, Escape restore and edge announcements; `installMatchMedia` verifies the reduced-motion class.',
    production: [
      'Persist the new order optimistically and roll back on failure.',
      'Use stable ids (never indexes) as keys so focus and state follow the item.',
      'Localise the announcement strings.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'chunked-file-upload',
    title: 'Chunked file upload with cancel and retry',
    section: 'scenario',
    category: 'Files & media',
    level: 'advanced',
    summary:
      'Picker + drop zone, client-side validation, chunked uploads with per-file progress, cancel, resumable retry and a concurrency limit — against a mocked endpoint.',
    tags: [
      'file upload',
      'chunked upload',
      'drop zone',
      'progress',
      'AbortController',
      'concurrency',
      'retry',
      'Blob.slice',
    ],
    demo: `${SCENARIOS}/file-upload/FileUploadScenario.tsx`,
    sources: [
      `${SCENARIOS}/file-upload/FileUploadScenario.tsx`,
      `${SCENARIOS}/file-upload/FileUploader.tsx`,
      `${SCENARIOS}/file-upload/uploadManager.ts`,
      `${SCENARIOS}/file-upload/validation.ts`,
      'mocks/extra/scenariosAdvanced.ts',
      'hooks/advanced/createStore.ts',
      'hooks/advanced/useExternalStore.ts',
      'hooks/async/fetchJson.ts',
    ],
    tests: [`${SCENARIOS}/file-upload/FileUploadScenario.test.tsx`],
    minReact: '18.0',
    officialDocs: [
      ABORT_DOCS,
      {
        label: 'MDN: Blob.slice()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Blob/slice',
      },
      {
        label: 'MDN: File drag and drop',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop',
      },
    ],
    related: ['use-external-store', 'use-retry', 'use-announcer', 'use-event-listener'],
    concept:
      'An upload manager outside React (built on `createStore`) owns the queue: each file is split with `Blob.slice` and its chunks are POSTed one after another to `/api/uploads/:id/chunks?index=N&total=M`, at most *N* files at a time. Components read the queue with `useExternalStore`; `File` objects and `AbortController`s stay outside state.',
    problem:
      'Large uploads fail halfway on flaky networks, users need to see progress and cancel one file without losing the others, and firing every file at once saturates the connection.',
    whenToUse: [
      'Uploads of large files or many files, where resumability and progress matter.',
      'When the server (or object storage multipart API) accepts chunked uploads.',
    ],
    whenNotToUse: [
      'Small single files: a plain `<form>` or one `fetch` with `FormData` is enough.',
      'Production uploads to S3/GCS/Azure: use their multipart/resumable protocols (or tus/Uppy), which add checksums, server-side resume and expiry.',
      '`fetch` does not report upload progress *within* a request; if you need byte-level progress of one big request use `XMLHttpRequest.upload.onprogress`. Here progress is counted per confirmed chunk.',
    ],
    execution: [
      'Pick or drop files → `validateFile` checks emptiness, size and type → rejected files are listed; accepted files are added as `queued`.',
      '`pump()` starts queued files while fewer than `concurrency` are `uploading`.',
      'Each file loops over its remaining chunks with `fetchJson(…, { signal })`; every confirmed chunk updates `chunksDone`.',
      'After the last chunk `POST /complete` verifies that all chunks arrived; the file becomes `done` and a polite announcement is made.',
      'Cancel aborts the controller, discards the partial upload (`DELETE`) and frees a slot; a failed chunk marks the file `error` and keeps `chunksDone`, so Retry resumes from the failed chunk.',
      'Unmount (`dispose`) aborts every request and stops the queue; mount (`activate`) resumes it — safe under Strict Mode.',
    ],
    edgeCases: [
      'A file name containing “fail” makes chunk 2 fail once with 503 (mock) — Retry resumes at chunk 2, not chunk 1.',
      'Changing the concurrency limit takes effect immediately; changing the chunk size affects newly added files only.',
      'Dropping a file next to the drop zone is prevented from navigating the page away.',
      'The same file can be picked twice in a row (the input value is reset).',
      '`accept` on the input is only a hint: validation runs again on every file, including dropped ones.',
    ],
    testing:
      'MSW serves the chunk endpoint with a configurable delay. Tests assert the chunk indexes sent (`server.events`), progress and status per file, validation messages, the concurrency limit, cancelling one file (abort spy + DELETE) while another finishes, resumable retry (`[0, 1, 1, 2]`), dropped files and aborting in-flight requests on unmount.',
    production: [
      'Validate type and size on the server too — client checks are UX, not security.',
      'Use idempotent chunk writes (the mock ignores duplicate indexes) and checksums per chunk.',
      'Expire abandoned partial uploads on the server.',
      'Retry failed chunks automatically with backoff (`useRetry`/`computeBackoff`) before surfacing an error.',
    ],
    diagram: {
      title: 'Chunked upload with cancel',
      description:
        'Chunks are sent sequentially per file; cancel aborts the in-flight chunk and discards the partial upload, while other files keep uploading.',
      mermaid: `sequenceDiagram
    actor User
    participant UI as FileUploader
    participant M as Upload manager
    participant API as Mock API
    User->>UI: choose 2 files
    UI->>M: add(files)
    M->>API: POST /uploads/a/chunks?index=0
    M->>API: POST /uploads/b/chunks?index=0
    API-->>M: 200 chunk a0
    M-->>UI: a progress 1 of 3
    M->>API: POST /uploads/a/chunks?index=1
    User->>UI: Cancel b
    UI->>M: cancel(b)
    M->>M: abort controller b
    M->>API: DELETE /uploads/b
    API-->>M: 200 chunk a1
    M->>API: POST /uploads/a/chunks?index=2
    API-->>M: 200 chunk a2
    M->>API: POST /uploads/a/complete
    API-->>M: 200 all chunks received
    M-->>UI: a done, b canceled`,
    },
  },

  // ---------------------------------------------------------------------
  {
    id: 'image-preview-object-urls',
    title: 'Image previews with object URLs',
    section: 'scenario',
    category: 'Files & media',
    level: 'intermediate',
    summary:
      'Local image previews with `URL.createObjectURL`, revoked on removal, replacement and unmount, with dimensions and required alt text.',
    tags: [
      'image preview',
      'createObjectURL',
      'revokeObjectURL',
      'memory leak',
      'alt text',
      'file input',
    ],
    demo: `${SCENARIOS}/image-preview/ImagePreviewScenario.tsx`,
    sources: [
      `${SCENARIOS}/image-preview/ImagePreviewScenario.tsx`,
      `${SCENARIOS}/image-preview/useObjectUrls.ts`,
      `${SCENARIOS}/image-preview/imageRules.ts`,
    ],
    tests: [`${SCENARIOS}/image-preview/ImagePreviewScenario.test.tsx`],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'MDN: URL.createObjectURL()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static',
      },
      {
        label: 'MDN: URL.revokeObjectURL()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static',
      },
      {
        label: 'W3C: An alt decision tree',
        url: 'https://www.w3.org/WAI/tutorials/images/decision-tree/',
      },
    ],
    related: ['use-ref-dom-and-values', 'use-effect-fundamentals', 'chunked-file-upload'],
    concept:
      'A small local hook, `useObjectUrls`, creates `blob:` URLs in event handlers, tracks them in a ref and revokes them on `revoke(url)` and — for any URL still alive — on unmount. Each preview reads `naturalWidth/naturalHeight` in `onLoad`; publishing requires alt text or an explicit “decorative” choice.',
    problem:
      'Every object URL pins its file in memory until it is revoked or the document unloads. Creating URLs during render (impure, repeated) or forgetting to revoke them on remove/replace leaks memory, and image galleries are routinely published without alt text.',
    whenToUse: [
      'Previews before upload, local image editing, avatar pickers.',
      'Showing any local `Blob` (PDF, video, generated canvas output) in an element that needs a URL.',
    ],
    whenNotToUse: [
      'Images already on a server: use their URL (with `srcset`).',
      'Tiny thumbnails you also need to persist as text: `FileReader.readAsDataURL` (but data URLs are large strings).',
    ],
    execution: [
      'Change event: files are validated (`image/*`, size), then `create(file)` returns a URL that is stored with the item — never created in render or in a state updater (Strict Mode would run it twice).',
      'Render: `<img src={url} alt={decorative ? "" : alt}>`; `onLoad` stores the natural dimensions, `onError` reports an undecodable file.',
      'Remove: `revoke(item.url)` in the handler, then remove the item and move focus back to the picker.',
      'Replace: revoke the old URL, create a new one and clear the alt text (it described the old image).',
      'Unmount: the effect cleanup revokes every URL still tracked.',
      'Publish: missing alt texts are rendered as errors with `flushSync`, then focus moves to the first invalid field.',
    ],
    edgeCases: [
      '`URL.createObjectURL` missing → a warning and name-only cards (feature-detected with `useSyncExternalStore`, hydration-safe).',
      'Non-image files picked through “All files” are rejected with a reason.',
      'Decorative images get `alt=""` so screen readers skip them; the alt field is disabled.',
      'Advice for common alt-text mistakes (file names, “image of…”, overly long text).',
    ],
    testing:
      'Tests replace `URL.createObjectURL`/`revokeObjectURL` with spies (jsdom does not implement them for its `File`) and assert exactly which URLs are revoked on removal, replacement, “Remove all” and unmount. Dimensions are tested by defining `naturalWidth/Height` and firing `load`; the publish flow asserts `aria-invalid`, focus and the status message.',
    production: [
      'Downscale large images in a worker (`createImageBitmap` + `OffscreenCanvas`) before uploading.',
      'Strip EXIF location data server-side.',
      'Let users write long descriptions as captions rather than alt text.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'clipboard-copy-paste',
    title: 'Copy to clipboard with feedback and fallback',
    section: 'scenario',
    category: 'Editing & interaction',
    level: 'intermediate',
    summary:
      'Copy buttons with visible and announced feedback, a select-the-text fallback in insecure contexts, and an optional paste button with a permission note.',
    tags: ['clipboard', 'copy', 'paste', 'secure context', 'permissions', 'aria-live'],
    demo: `${SCENARIOS}/clipboard/ClipboardScenario.tsx`,
    sources: [
      `${SCENARIOS}/clipboard/ClipboardScenario.tsx`,
      'hooks/browser/useClipboard.ts',
      'hooks/accessibility/useAnnouncer.ts',
      'hooks/advanced/usePermission.ts',
    ],
    tests: [`${SCENARIOS}/clipboard/ClipboardScenario.test.tsx`],
    minReact: '18.0',
    support: {
      level: 'browser-limited',
      notes:
        'The async Clipboard API exists only in secure contexts (HTTPS, localhost). Reading needs the `clipboard-read` permission in Chromium and a paste confirmation in Safari/Firefox.',
    },
    officialDocs: [
      {
        label: 'MDN: Clipboard API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API',
      },
      {
        label: 'MDN: Secure contexts',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts',
      },
      LIVE_REGION_DOCS,
    ],
    related: ['use-clipboard', 'use-announcer', 'use-permission'],
    concept:
      'Each snippet owns a `useClipboard({ resetAfterMs: 2000 })`, so feedback is independent per button. Success flips the button to “Copied!” and announces “… copied to the clipboard.”; failures show a reason and are announced assertively. Without the API, a “Select” button selects the read-only field so the user copies with the keyboard.',
    problem:
      'Copy buttons often give no feedback to screen-reader users, throw on plain HTTP (where `navigator.clipboard` is undefined) and silently fail when the browser blocks access.',
    whenToUse: ['Install commands, share links, API keys, code samples, coupon codes.'],
    whenNotToUse: [
      'Pasting into your own field: the native paste event (`onPaste`) needs no permission — prefer it over `navigator.clipboard.readText()`.',
      'Copying rich content (HTML, images): use `clipboard.write()` with `ClipboardItem` instead of `writeText`.',
    ],
    execution: [
      'Click: `copy(text)` awaits `writeText`; on success `copied` is true for 2 s (timer cleared on unmount or the next copy).',
      'The handler awaits the boolean result and calls `announce()` — polite for success, assertive for failure.',
      'Unsupported (insecure context): the copy button is replaced by “Select”, which focuses and selects the field and shows the platform shortcut.',
      'Paste: an explicit click calls `read()`; the result fills an editable textarea. `usePermission("clipboard-read")` shows the permission state where the Permissions API knows it.',
    ],
    edgeCases: [
      '`NotAllowedError` (page not focused, permission denied) gets a human message; other errors show name and message.',
      'Paste is disabled when `readText` is missing (Firefox before 125, insecure contexts).',
      'The permission badge shows `unsupported` or `error` in browsers that do not expose `clipboard-read`.',
      'The deprecated `document.execCommand("copy")` fallback is deliberately not used.',
    ],
    testing:
      'Tests install a fake `navigator.clipboard` and `isSecureContext` (after `userEvent.setup()`, which installs its own stub), use `shouldAdvanceTime` fake timers for the reset, read the shared live regions, and cover blocked writes, the insecure fallback with real selection ranges, denied reads, a write-only clipboard and a stubbed Permissions API.',
    production: [
      'Never copy secrets without the user asking; consider clearing sensitive clipboard content after use.',
      'Keep the visible feedback near the button — the live region is for assistive technology, not a replacement.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'responsive-layout-switching',
    title: 'Responsive layout: container vs viewport',
    section: 'scenario',
    category: 'Architecture',
    level: 'intermediate',
    summary:
      'One settings screen rendered as a sidebar, tabs or stacked sections, chosen by the container width (useElementSize) or the viewport (useMediaQuery) — and when to use CSS instead.',
    tags: [
      'responsive',
      'container queries',
      'media queries',
      'ResizeObserver',
      'tabs',
      'layout',
      'useElementSize',
    ],
    demo: `${SCENARIOS}/responsive-layout/ResponsiveLayoutScenario.tsx`,
    sources: [
      `${SCENARIOS}/responsive-layout/ResponsiveLayoutScenario.tsx`,
      `${SCENARIOS}/responsive-layout/layoutRules.ts`,
      `${SCENARIOS}/responsive-layout/ResponsiveLayoutScenario.css`,
      'hooks/browser/useElementSize.ts',
      'hooks/browser/useMediaQuery.ts',
      'hooks/browser/useWindowSize.ts',
      'hooks/accessibility/useRovingTabIndex.ts',
    ],
    tests: [`${SCENARIOS}/responsive-layout/ResponsiveLayoutScenario.test.tsx`],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'MDN: CSS container queries',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries',
      },
      { label: 'WAI-ARIA APG: Tabs', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/' },
      {
        label: 'MDN: ResizeObserver',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver',
      },
    ],
    related: ['use-element-size', 'use-media-query', 'use-window-size', 'use-roving-tab-index'],
    concept:
      'The layout mode is *derived* during render: from `useElementSize` (the component’s own width — correct inside a sidebar, a split pane or a dashboard tile) or from `useMediaQuery` (the viewport). `useWindowSize` only reports numbers. The selected section lives above the three layouts, so switching keeps the user’s place. A profile card next to it re-flows with a pure CSS container query.',
    problem:
      'Viewport breakpoints are wrong for reusable components (a “wide” screen can host a narrow panel), and JavaScript layout switching is often used where CSS would do the job without re-renders or hydration flashes.',
    whenToUse: [
      'The component tree must differ: tabs (role="tablist", arrow keys) versus a navigation sidebar versus stacked headings.',
      'Components that live in containers of unknown width.',
    ],
    whenNotToUse: [
      'Only styling changes (columns, spacing, font size): use CSS media or container queries — no JavaScript, no re-render, correct before hydration.',
      'Server-rendered pages that must look right on first paint: JS measurement is unknown on the server; prefer CSS or a mobile-first default.',
    ],
    execution: [
      '`useElementSize` attaches a `ResizeObserver` through a callback ref and re-renders only when the border-box size changes.',
      '`modeForWidth` (≥720 sidebar, ≥460 tabs) or `modeForViewport` (media queries) picks the mode during render.',
      'Tabs use `useRovingTabIndex` with automatic activation (arrow keys select), the sidebar uses `aria-current`, stacked mode renders all sections.',
      'The slider changes the container’s `max-width` without touching the viewport — only the container strategy reacts.',
    ],
    edgeCases: [
      'Before the first measurement (and on the server) the width is 0 → mobile-first stacked layout.',
      'Without `ResizeObserver` the scenario falls back to the viewport strategy and says so.',
      'Switching layouts keeps the selected section and the tab with focus.',
    ],
    testing:
      'Tests install the `ResizeObserver` and `matchMedia` fakes from `browserMocks`, resize the container to cross each breakpoint, flip media queries, drive the tabs with arrow keys, check the slider’s `max-width` and the unsupported fallback.',
    production: [
      'Avoid layout thrash: decide breakpoints with hysteresis if content can change the container width.',
      'Keep the DOM order meaningful in every mode for screen readers.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'large-list-search-performance',
    title: 'Searching 10,000 rows: deferred, memoised, windowed',
    section: 'scenario',
    category: 'Performance',
    level: 'advanced',
    summary:
      'A 10k-item search rendered naively, with useDeferredValue or useTransition + memoised rows, and with a fixed-height window — with timings measured live.',
    tags: [
      'performance',
      'useDeferredValue',
      'useTransition',
      'memo',
      'useCallback',
      'Profiler',
      'virtualization',
      'windowing',
      'large lists',
    ],
    demo: `${SCENARIOS}/searchable-list-performance/SearchableListPerformanceScenario.tsx`,
    sources: [
      `${SCENARIOS}/searchable-list-performance/SearchableListPerformanceScenario.tsx`,
      `${SCENARIOS}/searchable-list-performance/SearchBench.tsx`,
      `${SCENARIOS}/searchable-list-performance/metrics.ts`,
      `${SCENARIOS}/searchable-list-performance/catalogData.ts`,
      'hooks/browser/useScrollPosition.ts',
      'hooks/advanced/useExternalStore.ts',
    ],
    tests: [`${SCENARIOS}/searchable-list-performance/SearchableListPerformanceScenario.test.tsx`],
    minReact: '18.0',
    officialDocs: [
      { label: 'useDeferredValue', url: 'https://react.dev/reference/react/useDeferredValue' },
      { label: 'useTransition', url: 'https://react.dev/reference/react/useTransition' },
      { label: '<Profiler>', url: 'https://react.dev/reference/react/Profiler' },
      { label: 'memo', url: 'https://react.dev/reference/react/memo' },
      { label: 'TanStack Virtual', url: 'https://tanstack.com/virtual/latest' },
    ],
    related: [
      'use-deferred-value',
      'use-transition',
      'memo',
      'use-callback',
      'profiler',
      'large-lists',
    ],
    concept:
      'The same list is rendered four ways. **Naive** filters and renders every row in the keystroke’s commit. **Deferred** (`useDeferredValue`) and **transition** (`useTransition`) commit the input first and render the list in an interruptible background pass; memoised rows (`memo` + a stable `useCallback`) skip unchanged rows. **Windowed** renders only the rows inside a fixed-height viewport (36 px rows, overscan 6) under a spacer as tall as the full list.',
    problem:
      'Filtering and rendering thousands of rows on every keystroke blocks the main thread, so typing lags. Claims about which fix is faster are meaningless unless measured on the user’s device.',
    whenToUse: [
      'Client-side filtering of large in-memory lists (catalogues, logs, tables).',
      'As a measurement harness before reaching for a library.',
    ],
    whenNotToUse: [
      'Production virtualisation: use TanStack Virtual or react-window (variable heights, grids, scroll-to-index, sticky rows).',
      'Server-side search: debounce + cancellation (see “Search with cancellation”) matters more than rendering.',
      'If the React Compiler is enabled, hand-written `memo`/`useCallback` are mostly unnecessary.',
    ],
    execution: [
      'Keystroke: the change handler stores `performance.now()` in the metrics recorder (not in state, so nothing re-renders).',
      'The commit containing the keystroke is measured by an outer `<Profiler>`; the list commit by an inner one (development/profiling builds only).',
      'A layout effect in the results component records “keystroke → list committed” and the number of `<li>` in the DOM — works in production builds too.',
      'The metrics live in a `createStore` store read by the table with `useExternalStore`, so recording a number never re-renders the measured list.',
      'Windowed: `useScrollPosition` (rAF-batched, passive) gives `scrollTop`; `visibleRange` clamps it and adds overscan; rows carry `aria-setsize/aria-posinset`.',
    ],
    edgeCases: [
      'Opening the page uses the windowed strategy so 10,000 rows are not mounted at once; switch to “naive” to feel the difference.',
      'A new query scrolls the results to the top; a shrinking list clamps the window to the last page.',
      'Pinning a row in the memoised strategies re-renders one row; in naive mode every row re-renders (new inline callbacks).',
      'Profiler columns stay empty in production builds — the UI says so instead of showing fake numbers.',
    ],
    testing:
      'Tests render the bench with a few hundred items, type with user-event, and assert results counts, rows in the DOM, that each strategy produced *measured* values (formatted numbers, not fixed text), windowed rendering before/after a scroll event, pin toggling and resetting. Pure helpers (`filterItems`, `splitMatches`, `visibleRange`, `summarize`) are unit-tested.',
    production: [
      'Measure in a production build with CPU throttling; development builds are several times slower.',
      'Move expensive filtering (fuzzy search, sorting large data) to a Web Worker (`useWebWorker`).',
      'Virtualised lists need care for find-in-page and screen readers: keep the full count discoverable.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'selector-based-external-store',
    title: 'Observable store with selector subscriptions',
    section: 'scenario',
    category: 'Architecture',
    level: 'intermediate',
    summary:
      'An external store read through selectors (useExternalStore), the raw useSyncExternalStore primitive and an RxJS view (useObservable) — with render counts proving unrelated components stay still.',
    tags: [
      'external store',
      'selectors',
      'useSyncExternalStore',
      'RxJS',
      'observable',
      're-renders',
      'shallow equality',
    ],
    demo: `${SCENARIOS}/observable-store/ObservableStoreScenario.tsx`,
    sources: [
      `${SCENARIOS}/observable-store/ObservableStoreScenario.tsx`,
      `${SCENARIOS}/observable-store/shopStore.ts`,
      'hooks/advanced/createStore.ts',
      'hooks/advanced/useExternalStore.ts',
      'hooks/advanced/useObservable.ts',
      'components/ui/RenderCount.tsx',
    ],
    tests: [`${SCENARIOS}/observable-store/ObservableStoreScenario.test.tsx`],
    minReact: '18.0',
    officialDocs: [
      USE_SYNC_EXTERNAL_STORE_DOCS,
      { label: 'RxJS: Observable', url: 'https://rxjs.dev/guide/observable' },
    ],
    related: [
      'use-external-store',
      'use-observable',
      'use-sync-external-store',
      'rxjs-observable-store',
      'zustand',
      'use-context-performance',
    ],
    concept:
      'State lives in a `createStore` store created once per scenario instance. Each panel subscribes to a slice: `useExternalStore(store, selectUserName)`, `selectItemCount`, `selectCart`… A store change notifies every subscriber, but `useSyncExternalStore` compares snapshots and skips components whose selected value did not change. An RxJS `Observable` wraps the same store, and `pipe(map, distinctUntilChanged, pairwise)` derives “previous → current total”, consumed with `useObservable`.',
    problem:
      'Putting app state in one context re-renders every consumer on every change. Subscribing to a store without selectors (or with selectors returning new objects) has the same cost.',
    whenToUse: [
      'Shared client state read by many components that each need a small slice.',
      'Integrating non-React sources (websockets, SDKs, RxJS streams) without tearing.',
    ],
    whenNotToUse: [
      'State used by one component or a small subtree: `useState`/`useReducer` and props.',
      'Server state: TanStack Query/SWR handle caching, refetching and deduplication.',
      'A mature store is usually better than a hand-rolled one: Zustand has the same core plus devtools and middleware.',
    ],
    execution: [
      'Actions call `setState`; an updater returning the same state is a no-op and notifies nobody.',
      'After each change React calls every subscriber’s memoised `getSnapshot`; equal selections return the previous reference, so `Object.is` says “unchanged” and the component is not rendered.',
      '`RenderCount` (a `<Profiler>`) writes the commit count straight to the DOM, so measuring does not cause renders.',
      'The RxJS observable emits the current state on subscribe and every change after; `useObservable` subscribes in a layout effect and unsubscribes on unmount.',
    ],
    edgeCases: [
      '“Whole state” subscribes without a selector and commits on every change.',
      '“Summary” selects a new object each time: with `shallowEqualObjects` it stays still on unrelated changes, with `Object.is` it renders every time. Its checkbox lives inside it, so toggling re-renders only Summary.',
      'Adding when the catalogue is exhausted returns the same state: no notification, no renders.',
      'Selectors are module-level and the observable is memoised — inline selectors/pipes would resubscribe each render.',
    ],
    testing:
      'Store tests assert notifications and no-op updates and read the observable with `firstValueFrom(take(2), toArray())`. UI tests read the `RenderCount` numbers and assert exactly which components committed after each action, including the shallow-equality toggle.',
    production: [
      'Create stores per request on the server (or per test) when they hold user data — never a module singleton.',
      'Keep derived data in selectors; memoise expensive ones (e.g. with `reselect`).',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'esp-trading-blotter',
    title: 'ESP trading desk: ticket, blotter and positions',
    section: 'scenario',
    category: 'Architecture',
    level: 'advanced',
    summary:
      'Three independent useEspReducer stores on one esp-js router: a risk-checked order ticket, a trade blotter and a position summary, with an event inspector.',
    tags: [
      'esp-js',
      'event router',
      'publish',
      'broadcast',
      'preview filter',
      'middleware',
      'trading',
      'blotter',
    ],
    demo: `${SCENARIOS}/esp-blotter/EspBlotterScenario.tsx`,
    sources: [
      `${SCENARIOS}/esp-blotter/EspBlotterScenario.tsx`,
      `${SCENARIOS}/esp-blotter/TradingDesk.tsx`,
      `${SCENARIOS}/esp-blotter/trading.ts`,
      `${SCENARIOS}/esp-blotter/simulatedExchange.ts`,
      'middleware/esp-js/useEspReducer.ts',
      'middleware/esp-js/bridge.ts',
      'middleware/esp-js/espMiddleware.ts',
    ],
    tests: [`${SCENARIOS}/esp-blotter/EspBlotterScenario.test.tsx`],
    minReact: '19.0',
    support: {
      level: 'client-only',
      notes:
        'esp-js 8 references `self` when imported, so it cannot be imported during Node SSR without a shim.',
    },
    officialDocs: [
      { label: 'esp-js on GitHub', url: 'https://github.com/esp/esp-js' },
      {
        label: 'useSyncExternalStore',
        url: 'https://react.dev/reference/react/useSyncExternalStore',
      },
    ],
    related: [
      'esp-middleware-overview',
      'esp-stages-and-filtering',
      'esp-error-isolation',
      'reducer-middleware-pipeline',
    ],
    concept:
      'The scenario creates a fresh `new Router()` (in `useState`) and provides it with `<EspRouterProvider>`. The **ticket** publishes `ORDER_SUBMITTED` to its own model; a preview-stage filter cancels orders whose notional exceeds the risk limit, and `commitEventTypes` makes accepted ones pass the committed stage. A **simulated exchange** — plain reducer middleware on the ticket store — schedules a fill for each accepted order and **broadcasts** `ORDER_FILLED`. The **blotter** and **positions** stores observe fills; busting a trade in the blotter broadcasts `TRADE_BUSTED`, which reverses the position. `onStage` from all three stores feeds the inspector.',
    problem:
      'Trading screens are made of independent widgets that must react to the same business events (fills, busts) without importing each other or sharing one global store — and some events must be validated or vetoed before any state changes.',
    whenToUse: [
      'Workspaces of independently mounted tiles that exchange events, especially when the app already uses esp-js models.',
      'When you need a deterministic, run-to-completion event loop with preview/normal/committed/final stages.',
    ],
    whenNotToUse: [
      'Shared state without event semantics: an external store or Zustand is simpler.',
      'Real order routing: risk checks belong on the server; the client filter is a fast pre-check only.',
    ],
    execution: [
      'Mount: each `useEspReducer` creates its store once and registers a bridge model in an effect (Strict Mode registers, removes and re-registers).',
      'Place order: `esp.publish(ORDER_SUBMITTED, order)` → ESP middleware → `router.publishEvent(ticketModelId, …)`.',
      'Preview stage: the filter (always the latest risk limit, no re-registration) cancels or allows the event; a cancellation is traced as `canceled` and recorded as a rejection.',
      'Accepted: normal → committed → final; the bridge dispatches `{ type: ORDER_SUBMITTED, payload }` into the ticket store, the exchange middleware lets the reducer run, then starts a fill timer.',
      'Timer: the middleware dispatches `espBroadcast(ORDER_FILLED, fill)`; the router delivers it to the ticket (removes the working order), blotter (adds a row) and positions (aggregates).',
      'Bust: the blotter broadcasts `TRADE_BUSTED`; blotter and positions update. Unmount: models are removed and pending fill timers cleared.',
    ],
    edgeCases: [
      'Fills and busts are idempotent (duplicate trade ids are ignored), and a second bust changes nothing.',
      'Raising the risk limit takes effect for the next order immediately.',
      'Two scenario instances have separate routers: events never cross between them.',
      'Unmounting with a fill pending cancels it instead of routing into a removed model.',
    ],
    testing:
      'Pure reducers are unit-tested (idempotency, reversal). The exchange middleware is tested with fake timers and `dispose`. UI tests use a short fill delay and assert the status line, the three stores, the inspector stages (`committed`, `canceled`, `final`, lifecycle), busts, router isolation between two instances and clean unmounting.',
    production: [
      'Type every event payload and validate events crossing process boundaries.',
      'Keep `onStage` tracing for development; it runs for every stage of every event.',
      'Model the exchange connection as its own esp-js model or service instead of middleware when it has state (reconnects, heartbeats).',
    ],
    diagram: {
      title: 'ESP event flow between the ticket, blotter and positions stores',
      description:
        'The ticket publishes to itself through a preview filter; the simulated exchange broadcasts fills to all three stores; the blotter broadcasts busts.',
      mermaid: `sequenceDiagram
    actor Trader
    participant T as Ticket store
    participant R as esp-js Router
    participant X as Exchange middleware
    participant B as Blotter store
    participant P as Positions store
    Trader->>T: Place order
    T->>R: publish ORDER_SUBMITTED
    R->>R: preview filter checks risk limit
    alt notional above limit
        R-->>T: canceled, onStage records rejection
    else accepted
        R->>T: final ORDER_SUBMITTED
        T->>X: action passes middleware
        X-->>X: schedule fill
        X->>R: broadcast ORDER_FILLED
        R->>T: remove working order
        R->>B: add trade row
        R->>P: update position
    end
    Trader->>B: Bust trade
    B->>R: broadcast TRADE_BUSTED
    R->>B: mark busted
    R->>P: reverse position`,
    },
  },

  // ---------------------------------------------------------------------
  {
    id: 'error-boundaries-and-retry',
    title: 'Error recovery: boundaries, async errors and retries',
    section: 'scenario',
    category: 'Resilience',
    level: 'intermediate',
    summary:
      'A resettable error boundary with “Try again” and reset keys, event-handler and effect errors surfaced through state, and a flaky request retried with useRetry — all reported to an on-screen mock reporter.',
    tags: [
      'error boundary',
      'getDerivedStateFromError',
      'componentDidCatch',
      'resetKeys',
      'retry',
      'backoff',
      'error reporting',
      'onCaughtError',
    ],
    demo: `${SCENARIOS}/error-recovery/ErrorRecoveryScenario.tsx`,
    sources: [
      `${SCENARIOS}/error-recovery/ErrorRecoveryScenario.tsx`,
      `${SCENARIOS}/error-recovery/ErrorRecoveryLab.tsx`,
      `${SCENARIOS}/error-recovery/ResettableErrorBoundary.tsx`,
      `${SCENARIOS}/error-recovery/errorReporter.ts`,
      'hooks/async/useRetry.ts',
      'hooks/async/useAsync.ts',
    ],
    tests: [`${SCENARIOS}/error-recovery/ErrorRecoveryScenario.test.tsx`],
    minReact: '18.0',
    officialDocs: [
      {
        label: 'Catching rendering errors with an error boundary',
        url: 'https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary',
      },
      {
        label: 'createRoot options',
        url: 'https://react.dev/reference/react-dom/client/createRoot',
      },
      {
        label: 'react-error-boundary',
        url: 'https://github.com/bvaughn/react-error-boundary',
      },
    ],
    related: ['use-retry', 'use-async', 'suspense-error-boundary', 'testing-network-msw'],
    concept:
      'Four failure modes side by side. (1) A render error is caught by `ResettableErrorBoundary` (a class — there is no hook for `getDerivedStateFromError`/`componentDidCatch`), which offers “Try again” and clears itself when a `resetKeys` value changes. (2) An event-handler error is caught with try/catch and stored in state. (3) A failed fetch in `useAsync` is shown inline — or escalated by rethrowing during render so the boundary takes over. (4) `useRetry` retries `/api/flaky` with exponential backoff. Every failure goes to a mock reporter.',
    problem:
      'Without boundaries one bad component unmounts the whole app; boundaries alone miss errors from handlers, timers and promises; and blind retries either hammer the server or give up on transient failures.',
    whenToUse: [
      'Around independent regions (widgets, routes, panels) so a failure stays local.',
      'Retry only idempotent, transient failures (network, 408/429/5xx).',
    ],
    whenNotToUse: [
      'Do not wrap every component: boundaries per region are enough, and too many fallbacks fragment the UI.',
      'Do not retry 4xx validation or auth errors — the same request will fail again.',
      'Data-fetching libraries (TanStack Query, SWR) already include retry, backoff and error states.',
    ],
    execution: [
      'Render error: `getDerivedStateFromError` switches to the fallback; `componentDidCatch` reports the error and component stack.',
      '“Try again” calls `onReset` then clears the error; if the cause is unchanged the child throws again (counted). “Fix data and retry” fixes the cause first.',
      '`componentDidUpdate` clears the error when `resetKeys` change (e.g. switching account).',
      'Handler error: try/catch → state → inline `role="alert"` with `aria-invalid`.',
      'Effect error: `useAsync` exposes `status: "error"`; an effect reports it once (deduplicated across Strict Mode re-runs); escalation rethrows it during render.',
      '`useRetry`: each failed attempt calls `onRetry` (reported) and waits `computeBackoff` with equal jitter; cancel aborts the attempt and the pending timer.',
    ],
    edgeCases: [
      'Boundaries do not catch event-handler errors — verified in a test with a probe boundary and the window `error` event.',
      'A fresh request key per run keeps the mock’s failure counter independent between runs and instances.',
      'Exhausting `maxAttempts` shows “Gave up after N attempts.”',
      'React 19 also reports errors globally through `createRoot(…, { onCaughtError, onUncaughtError, onRecoverableError })` — mentioned in the UI, not wired here.',
    ],
    testing:
      'Tests silence React’s expected `console.error` for caught errors, exercise the boundary directly (callback reset, reset keys, handler errors not caught), and drive every panel: repeated catches, fix-and-retry, reset key, handler errors, a 404 handled inline and escalated, retries until success (MSW `/api/flaky`), giving up and cancelling while waiting.',
    production: [
      'Send reports from `onCaughtError`/`onUncaughtError` once for the app; use boundaries for UX.',
      'Include a correlation id and the component stack in reports; scrub personal data.',
      'Offer a way out of a failing region (reload, navigate home) as well as “Try again”.',
    ],
  },

  // ---------------------------------------------------------------------
  {
    id: 'offline-action-queue',
    title: 'Offline banner and persisted action queue',
    section: 'scenario',
    category: 'Resilience',
    level: 'advanced',
    summary:
      'An offline banner from useOnlineStatus, connection hints from useNetworkInformation, and an outbox persisted in localStorage that replays when the app is back online — with a clearly labelled “simulate offline” switch.',
    tags: [
      'offline',
      'online status',
      'outbox',
      'queue',
      'replay',
      'localStorage',
      'idempotency',
      'Network Information API',
    ],
    demo: `${SCENARIOS}/connectivity/ConnectivityScenario.tsx`,
    sources: [
      `${SCENARIOS}/connectivity/ConnectivityScenario.tsx`,
      `${SCENARIOS}/connectivity/ConnectivityLab.tsx`,
      `${SCENARIOS}/connectivity/outbox.ts`,
      'hooks/browser/useOnlineStatus.ts',
      'hooks/browser/useNetworkInformation.ts',
      'hooks/storage/usePersistentState.ts',
    ],
    tests: [`${SCENARIOS}/connectivity/ConnectivityScenario.test.tsx`],
    minReact: '19.2',
    support: {
      level: 'browser-limited',
      notes:
        '`navigator.onLine` is universal; the Network Information API is Chromium-only and shown as unsupported elsewhere.',
    },
    officialDocs: [
      {
        label: 'MDN: Navigator.onLine',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine',
      },
      {
        label: 'MDN: Network Information API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API',
      },
      { label: 'useEffectEvent', url: 'https://react.dev/reference/react/useEffectEvent' },
    ],
    related: [
      'use-online-status',
      'use-network-information',
      'use-persistent-state',
      'use-effect-event',
      'optimistic-rollback',
    ],
    concept:
      'The app treats itself as online when `useOnlineStatus()` is true *and* the demo switch is off. Offline (or while older actions are still queued) new todos go to an outbox stored with `usePersistentState` (versioned, validated, in localStorage). When the app is online again — or on mount with a queue left by an earlier visit — a `useEffectEvent` handler replays the outbox oldest first, sending each action with an `Idempotency-Key`.',
    problem:
      'Writes made on a train or in a lift are lost, or fail with an unhelpful error. `navigator.onLine === true` does not even guarantee the server is reachable, and JavaScript cannot switch the browser offline to demo or test any of this.',
    whenToUse: [
      'Field apps, note taking, checklists, carts — writes that can be applied later in order.',
      'Showing users that the app is offline and what will happen to their changes.',
    ],
    whenNotToUse: [
      'Writes that must be confirmed immediately (payments, bookings): block and explain instead of queueing.',
      'Full offline-first apps: use a Service Worker with Background Sync, IndexedDB and a sync engine or CRDT.',
    ],
    execution: [
      'Render: `online = browserOnline && !simulateOffline`; the banner (`role="status"`) is derived from `online`, `syncing` and the queue length.',
      'Submit offline (or with a non-empty outbox): append to the persisted outbox, keeping order.',
      'Submit online: POST directly; a `TypeError` (no connection) queues the action, an HTTP error is shown.',
      'Effect on `online`: when true, the effect event starts `replay()` if the outbox is not empty.',
      '`replay()`: guarded against concurrent runs; reads the latest queue through `useLatest`; removes successes, increments `attempts` on failures, and moves permanent failures (4xx, or 3 attempts) to “Needs attention”; stops on a network failure or when the app goes offline again.',
      'Unmount aborts the request in flight.',
    ],
    edgeCases: [
      'The “Simulate offline” switch is labelled as app-only: it stops requests but does not change `navigator.onLine`.',
      'Real `offline`/`online` events (DevTools → Network → Offline) drive the same flow.',
      'A queue persisted by an earlier visit is replayed on mount; corrupt or wrongly-shaped stored data is ignored (`validate`).',
      'A title containing “fail” returns 500 from the mock: it stays queued for three attempts, then needs attention and can be requeued.',
      'Two tabs may replay the same outbox — the idempotency key lets the server de-duplicate.',
    ],
    testing:
      'Tests toggle the simulated switch and the real events (`setOnline` from `browserMocks`), assert the banner, the outbox in localStorage, that no request leaves while offline (`server.events`), replay order and idempotency headers, replay on mount from pre-seeded storage, the attempt budget and dead-letter list, network errors (`HttpResponse.error()`), validation and a stubbed `navigator.connection`.',
    production: [
      'Use IndexedDB for larger queues and a Service Worker (Background Sync) to replay even when the page is closed.',
      'Coordinate replays across tabs (Web Locks API or a BroadcastChannel leader).',
      'Resolve conflicts explicitly when queued edits touch data that changed on the server.',
    ],
  },
];
