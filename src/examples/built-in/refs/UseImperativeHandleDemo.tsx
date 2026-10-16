import {
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type Ref,
} from 'react';
import { Button, Callout, Panel } from '../../../components/ui';
import './UseImperativeHandleDemo.css';

/** The only things a parent may do to the input. Not the whole DOM node. */
export interface ShakeInputHandle {
  focus(): void;
  clear(): void;
  shake(): void;
}

interface ShakeInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'value' | 'onChange'
> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  ref?: Ref<ShakeInputHandle>;
}

function ShakeInput({ label, value, onValueChange, ref, ...props }: ShakeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Each shake alternates between two identical animations so the browser
  // restarts it even when shake() is called again mid-animation.
  const [shakes, setShakes] = useState(0);
  const shakeClass =
    shakes === 0 ? '' : ` use-imperative-handle-demo-shake-${shakes % 2 === 1 ? 'a' : 'b'}`;
  const id = useId();

  // Expose a small, intention-revealing API instead of the <input> itself.
  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => {
        onValueChange('');
        inputRef.current?.focus();
      },
      shake: () => setShakes((count) => count + 1),
    }),
    [onValueChange],
  );

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        className={`input${shakeClass}`}
        data-shakes={shakes}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        {...props}
      />
    </div>
  );
}

/** A parent drives a custom input through a restricted imperative handle. */
export default function UseImperativeHandleDemo() {
  const inputRef = useRef<ShakeInputHandle>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setMessage('Enter the 6-digit code.');
      inputRef.current?.shake();
      inputRef.current?.focus();
      return;
    }
    setMessage(`Code ${code} accepted.`);
  };

  return (
    <div className="stack">
      <Panel
        title="Verification code"
        description="Submit an invalid code to see the handle in action."
      >
        <form className="stack" onSubmit={onSubmit} noValidate>
          <ShakeInput
            ref={inputRef}
            label="6-digit code"
            value={code}
            onValueChange={setCode}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <div className="row">
            <Button type="submit" variant="primary">
              Verify
            </Button>
            <Button onClick={() => inputRef.current?.focus()}>handle.focus()</Button>
            <Button onClick={() => inputRef.current?.clear()}>handle.clear()</Button>
            <Button onClick={() => inputRef.current?.shake()}>handle.shake()</Button>
          </div>
          {message ? (
            <p role="status" className="small">
              {message}
            </p>
          ) : null}
        </form>
      </Panel>
      <Callout title="Keep the handle small">
        Exposing <code>focus/clear/shake</code> instead of the DOM node keeps the input free to
        change its markup, and stops parents from reaching in to set <code>value</code> or styles
        behind React&apos;s back. Prefer props for anything that can be expressed as state — use a
        handle only for actions like focusing, scrolling or playing an animation.
      </Callout>
    </div>
  );
}
