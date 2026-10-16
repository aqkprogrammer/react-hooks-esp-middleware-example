import { useState } from 'react';
import { Button, Callout, Panel, TextField, ValueTable, show } from '../../../components/ui';
import { useSessionStorage, type StorageError } from '../../../hooks';

const STEPS = ['Shipping', 'Payment', 'Review'] as const;

const isStep = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < STEPS.length;
const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * A checkout wizard whose progress survives a reload of this tab, but not
 * closing it — and a second tab starts its own, independent checkout.
 */
export default function UseSessionStorageDemo() {
  const [lastError, setLastError] = useState<StorageError | null>(null);
  const [step, setStep, resetStep] = useSessionStorage('playground:checkout:step', 0, {
    validate: isStep,
    onError: setLastError,
  });
  const [address, setAddress, resetAddress] = useSessionStorage('playground:checkout:address', '', {
    validate: isString,
    onError: setLastError,
  });
  const current = STEPS[step] ?? STEPS[0];

  return (
    <div className="stack">
      <Panel
        title={`Step ${step + 1} of ${STEPS.length}: ${current}`}
        description="Reload the page: you stay on this step. Open the page in a new tab: that tab starts at step 1."
      >
        <TextField
          label="Delivery address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          hint="Saved to sessionStorage on every keystroke."
        />
        <div className="row">
          <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
          >
            Next
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetStep();
              resetAddress();
            }}
          >
            Start over (remove keys)
          </Button>
        </div>
      </Panel>
      <Panel title="What is stored">
        <ValueTable
          label="Session storage values"
          rows={{
            'playground:checkout:step': show(step),
            'playground:checkout:address': show(address),
          }}
        />
      </Panel>
      {lastError ? (
        <Callout tone="warn" title={`Storage error: ${lastError.kind}`}>
          {show(lastError.error)}
        </Callout>
      ) : null}
      <Callout title="Security">
        sessionStorage is readable by any script on this origin for as long as the tab is open.
        Never put tokens or personal data in it.
      </Callout>
    </div>
  );
}
