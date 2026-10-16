import { Callout, Panel, ValueTable } from '../../../components/ui';
import {
  formatLastInteraction,
  formatOnlineStatus,
  useLastInteractionDebug,
  useOnlineStatusDebug,
} from './debugValueHooks';

/**
 * Two custom hooks that label themselves with useDebugValue. The table
 * previews what React DevTools shows next to each hook.
 */
export default function UseDebugValueDemo() {
  const isOnline = useOnlineStatusDebug();
  const lastInteraction = useLastInteractionDebug();

  return (
    <div className="stack">
      <Panel
        title="Hook values"
        description="Click or press a key anywhere to update the last interaction."
      >
        <ValueTable
          label="Hook return values"
          rows={{
            'useOnlineStatusDebug()': String(isOnline),
            'useLastInteractionDebug()':
              lastInteraction === null ? 'null' : String(lastInteraction),
          }}
        />
      </Panel>
      <Panel
        title="What React DevTools shows"
        description="Open DevTools → Components, select UseDebugValueDemo and look at its hooks."
      >
        <ValueTable
          label="DevTools labels"
          rows={{
            OnlineStatusDebug: formatOnlineStatus(isOnline),
            LastInteractionDebug: formatLastInteraction(lastInteraction),
          }}
        />
      </Panel>
      <Callout title="For shared-library authors">
        <code>useDebugValue(value, format?)</code> only affects React DevTools. Add it to custom
        hooks that other people use and whose internals are hard to read from the hook tree. Pass
        the formatter as the second argument when formatting has a cost: DevTools calls it only when
        the component is inspected. Don&apos;t add it to every hook.
      </Callout>
    </div>
  );
}
