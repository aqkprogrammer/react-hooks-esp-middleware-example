import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import {
  formatShortcut,
  isApplePlatform,
  useAnnouncer,
  useClipboard,
  usePermission,
} from '../../../hooks';
import './ClipboardScenario.css';

interface Snippet {
  id: string;
  label: string;
  text: string;
  multiline?: boolean;
}

const SNIPPETS: readonly Snippet[] = [
  { id: 'install', label: 'Install command', text: 'npm install @tanstack/react-query' },
  {
    id: 'docs',
    label: 'Docs link',
    text: 'https://react.dev/reference/react/useSyncExternalStore',
  },
  {
    id: 'hook',
    label: 'Code snippet',
    text: "const { copy, copied } = useClipboard();\n<button onClick={() => copy('Hello')}>Copy</button>",
    multiline: true,
  },
];

const subscribeNever = () => () => {};
const serverFalse = () => false;

/**
 * Copy buttons with announced feedback, a manual fallback where the async
 * Clipboard API is unavailable (insecure context), and an optional paste
 * button with an explanation of the read permission.
 */
export default function ClipboardScenario() {
  const { isSupported } = useClipboard();
  return (
    <div className="stack">
      {isSupported ? null : (
        <Callout tone="warn" title="Clipboard API unavailable">
          <code>navigator.clipboard</code> only exists in secure contexts (HTTPS or{' '}
          <code>localhost</code>). The snippets below fall back to selecting the text so you can
          copy it with the keyboard.
        </Callout>
      )}
      <Panel title="Copy snippets" description="Each button gives visible and announced feedback.">
        <ul className="clipboard-snippets" aria-label="Snippets">
          {SNIPPETS.map((snippet) => (
            <CopySnippet key={snippet.id} snippet={snippet} />
          ))}
        </ul>
      </Panel>
      <PastePanel />
    </div>
  );
}

function CopySnippet({ snippet }: { snippet: Snippet }) {
  const { copy, copied, error, isSupported } = useClipboard({ resetAfterMs: 2000 });
  const { announce } = useAnnouncer();
  const apple = useSyncExternalStore(subscribeNever, isApplePlatform, serverFalse);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedHint, setSelectedHint] = useState(false);
  const fieldId = useId();

  const onCopy = async () => {
    const ok = await copy(snippet.text);
    if (ok) announce(`${snippet.label} copied to the clipboard.`);
    else announce(`Could not copy ${snippet.label}.`, { politeness: 'assertive' });
  };

  const onSelect = () => {
    const field = snippet.multiline ? textareaRef.current : inputRef.current;
    if (!field) return;
    field.focus();
    field.select();
    setSelectedHint(true);
  };

  const fieldProps = {
    id: fieldId,
    className: 'input mono clipboard-field',
    readOnly: true,
    value: snippet.text,
    onFocus: () => setSelectedHint(false),
  };

  return (
    <li className="clipboard-snippet">
      <label htmlFor={fieldId} className="field-label">
        {snippet.label}
      </label>
      <div className="clipboard-row">
        {snippet.multiline ? (
          <textarea ref={textareaRef} rows={2} {...fieldProps} />
        ) : (
          <input ref={inputRef} {...fieldProps} />
        )}
        {isSupported ? (
          <Button
            variant={copied ? 'primary' : 'secondary'}
            onClick={() => void onCopy()}
            aria-label={copied ? `${snippet.label} copied` : `Copy ${snippet.label}`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        ) : (
          <Button onClick={onSelect}>
            Select <span className="visually-hidden">{snippet.label}</span>
          </Button>
        )}
      </div>
      {selectedHint ? (
        <p className="field-hint">
          Selected — press <kbd className="kbd">{formatShortcut('mod+c', { apple })}</kbd> to copy.
        </p>
      ) : null}
      {error ? (
        <p className="field-error">
          {error.name === 'NotAllowedError'
            ? 'The browser blocked clipboard access (the page may not be focused). Select the text instead.'
            : `${error.name}: ${error.message}`}
        </p>
      ) : null}
    </li>
  );
}

function PastePanel() {
  const { read, error, isReadSupported } = useClipboard();
  const permission = usePermission('clipboard-read');
  const [pasted, setPasted] = useState('');
  const pastedId = useId();
  const { announce } = useAnnouncer();

  const onPaste = async () => {
    const text = await read();
    if (text === null) return;
    setPasted(text);
    announce(text ? `Pasted ${text.length} characters.` : 'The clipboard is empty.');
  };

  return (
    <Panel
      title="Paste from the clipboard (optional)"
      description="Reading is guarded more strictly than writing: only do it on an explicit click."
    >
      <div className="row">
        <Button onClick={() => void onPaste()} disabled={!isReadSupported}>
          Paste from clipboard
        </Button>
        <Badge tone="neutral" title="navigator.permissions.query({ name: 'clipboard-read' })">
          clipboard-read: {permission.status}
        </Badge>
      </div>
      <p className="small muted">
        Chromium asks for the <code>clipboard-read</code> permission the first time; Safari and
        Firefox show a one-off “Paste” confirmation instead and do not report the permission (the
        badge then shows <code>unsupported</code> or <code>error</code>). Prefer the native paste
        event (<kbd className="kbd">Ctrl</kbd>/<kbd className="kbd">⌘</kbd>+
        <kbd className="kbd">V</kbd> into a field) when you can — it needs no permission.
      </p>
      {isReadSupported ? null : (
        <p className="small">Reading the clipboard is not supported in this context.</p>
      )}
      <div className="field">
        <label htmlFor={pastedId} className="field-label">
          Pasted text
        </label>
        <textarea
          id={pastedId}
          className="mono"
          rows={3}
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
        />
      </div>
      {error ? (
        <p className="field-error">
          {error.name === 'NotAllowedError'
            ? 'Permission to read the clipboard was denied.'
            : `${error.name}: ${error.message}`}
        </p>
      ) : null}
    </Panel>
  );
}
