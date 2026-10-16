import { Router } from 'esp-js';
import { useCallback, useState } from 'react';
import { Button, EventLog, useEventLog } from '../components/ui';
import { EspRouterProvider, type EspStageInfo } from '../middleware/esp-js';
import { WorkspaceProvider } from './context/context';
import { AccumulatorsProvider, AccumulatorsTile } from './tiles/accumulators';
import { PriceTileProvider, PriceTile } from './tiles/priceTile';
import { EspTraceContext } from './trace';
import { Workspace } from './Workspace';

/**
 * The original example, migrated to React 19 + esp-js 8.
 *
 * The workspace exists to simulate events from a shell application, and also
 * acts like a package, just for the purpose of this example. Each instance
 * gets its own esp-js Router so demos and tests never share event state.
 */
export function EspDemo({ showInspector = true }: { showInspector?: boolean }) {
  const [router] = useState(() => new Router());
  const { entries, log, clear } = useEventLog(80);
  const [traceStages, setTraceStages] = useState(false);

  const trace = useCallback(
    (info: EspStageInfo) => {
      const isLifecycle = info.stage === 'preProcess' || info.stage === 'postProcess';
      if (!traceStages && info.stage !== 'final' && !isLifecycle && info.stage !== 'error') return;
      const shortId = info.modelId.replace(/-«?r?[\w:]+»?$/, '');
      log(
        `${shortId} · ${info.stage}${info.eventType ? ` · ${info.eventType}` : ''}${
          info.event === undefined ? '' : ` ${JSON.stringify(info.event)}`
        }`,
        info.stage === 'error' || info.stage === 'canceled' ? 'error' : 'info',
      );
    },
    [log, traceStages],
  );

  return (
    <EspRouterProvider router={router}>
      <EspTraceContext value={showInspector ? trace : undefined}>
        <WorkspaceProvider>
          <Workspace>
            <PriceTileProvider>
              <PriceTile />
            </PriceTileProvider>
            <AccumulatorsProvider>
              <AccumulatorsTile />
            </AccumulatorsProvider>
          </Workspace>
        </WorkspaceProvider>
        {showInspector ? (
          <div className="stack" style={{ marginTop: '1rem' }}>
            <div className="row">
              <Button
                size="sm"
                onClick={() => setTraceStages((value) => !value)}
                aria-pressed={traceStages}
              >
                {traceStages ? 'Hide' : 'Show'} preview/normal stages
              </Button>
            </div>
            <EventLog title="esp-js router inspector" entries={entries} onClear={clear} />
          </div>
        ) : null}
      </EspTraceContext>
    </EspRouterProvider>
  );
}

export default EspDemo;
