import { Callout } from '../../../components/ui';
import { ErrorRecoveryLab } from './ErrorRecoveryLab';
import './ErrorRecoveryScenario.css';

/**
 * Error boundaries, errors they cannot catch, and retrying flaky requests —
 * with every failure sent to an on-screen mock reporter.
 */
export default function ErrorRecoveryScenario() {
  return (
    <div className="stack">
      <Callout title="Where errors can come from">
        Render errors are caught by the nearest error boundary (a class component — there is no hook
        equivalent). Errors in event handlers, timers and promises are not: catch them and store
        them in state, or rethrow during render to hand them to a boundary. Transient network
        failures are retried with backoff.
      </Callout>
      <ErrorRecoveryLab />
    </div>
  );
}
