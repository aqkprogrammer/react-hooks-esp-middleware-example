import { memo } from 'react';
import { Badge, Button, Panel, RenderCount } from '../../../components/ui';
import { useBoolean } from '../../../hooks';

interface ToolbarProps {
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}

/**
 * Memoized: it only re-renders if one of the callbacks changes identity. The
 * memo boundary wraps the commit counter, so the counter stays at 1.
 */
const Toolbar = memo(function Toolbar({ onOpen, onClose, onToggle }: ToolbarProps) {
  return (
    <RenderCount label="Memoized toolbar">
      <div className="row">
        <Button onClick={onOpen}>Open</Button>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onToggle}>Toggle</Button>
      </div>
    </RenderCount>
  );
});

export default function UseBooleanDemo() {
  const details = useBoolean(false);
  return (
    <div className="stack">
      <Panel
        title="Disclosure"
        description="The toolbar is wrapped in React.memo and receives setTrue / setFalse / toggle."
      >
        <div className="spread">
          <Button
            variant="primary"
            aria-expanded={details.value}
            aria-controls="use-boolean-details"
            onClick={details.toggle}
          >
            {details.value ? 'Hide details' : 'Show details'}
          </Button>
          <Badge tone={details.value ? 'success' : 'neutral'}>
            {details.value ? 'open' : 'closed'}
          </Badge>
        </div>
        <div id="use-boolean-details" hidden={!details.value} className="card">
          The actions are created once, so <code>onClick=&#123;details.toggle&#125;</code> is safe
          and the memoized toolbar below never re-renders.
        </div>
        <Toolbar onOpen={details.setTrue} onClose={details.setFalse} onToggle={details.toggle} />
      </Panel>
    </div>
  );
}
