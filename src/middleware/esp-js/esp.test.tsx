import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'esp-js';
import { StrictMode, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../reducer/createReducerStore';
import { registerEspBridge, type EspStageInfo } from './bridge';
import { createEspMiddleware, espBroadcast, espPublish, types } from './espMiddleware';
import { EspRouterProvider } from './EspRouterProvider';
import { useEspReducer, type EspStoreAction } from './useEspReducer';

const KEY_PRESSED = 'KEY_PRESSED';

type Action = { type: typeof KEY_PRESSED; payload: { key: string } } | { type: 'reset' };
type State = { keys: string[]; lifecycle: string[] };
const initialState: State = { keys: [], lifecycle: [] };

function reducer(state: State, action: EspStoreAction<Action>): State {
  switch (action.type) {
    case KEY_PRESSED:
      return { ...state, keys: [...state.keys, action.payload.key] };
    case types.PREPROCESS_ACTION:
      return { ...state, lifecycle: [...state.lifecycle, 'pre'] };
    case types.POSTPROCESS_ACTION:
      return { ...state, lifecycle: [...state.lifecycle, `post:${action.payload.join(',')}`] };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

describe('ESP middleware + bridge (store level)', () => {
  it('routes publish to one model and broadcast to every observing model', () => {
    const router = new Router();
    const a = createReducerStore(reducer, initialState, [
      createEspMiddleware({ router, modelId: 'a' }),
    ]);
    const b = createReducerStore(reducer, initialState, [
      createEspMiddleware({ router, modelId: 'b' }),
    ]);
    const disposeA = registerEspBridge({
      router,
      modelId: 'a',
      eventTypes: [KEY_PRESSED],
      dispatch: (action) => a.dispatch(action as EspStoreAction<Action>),
    });
    const disposeB = registerEspBridge({
      router,
      modelId: 'b',
      eventTypes: [KEY_PRESSED],
      dispatch: (action) => b.dispatch(action as EspStoreAction<Action>),
    });

    a.dispatch(espPublish(KEY_PRESSED, { key: 'Delete' }));
    expect(a.getState().keys).toEqual(['Delete']);
    expect(b.getState().keys).toEqual([]);

    a.dispatch(espBroadcast(KEY_PRESSED, { key: 'Insert' }));
    expect(a.getState().keys).toEqual(['Delete', 'Insert']);
    expect(b.getState().keys).toEqual(['Insert']);

    // Lifecycle actions bracket each dispatch loop, as in the original example.
    expect(a.getState().lifecycle).toEqual([
      'pre',
      `post:${KEY_PRESSED}`,
      'pre',
      `post:${KEY_PRESSED}`,
    ]);

    disposeA();
    disposeB();
    expect(router.isModelRegistered('a')).toBe(false);
    expect(router.isModelRegistered('b')).toBe(false);
  });

  it('passes ordinary actions straight through to the reducer', () => {
    const router = new Router();
    const store = createReducerStore(reducer, { keys: ['x'], lifecycle: [] }, [
      createEspMiddleware({ router, modelId: 'solo' }),
    ]);
    store.dispatch({ type: 'reset' });
    expect(store.getState()).toBe(initialState);
  });

  it('drops events for types the model does not observe (esp-js 8 semantics)', () => {
    const router = new Router();
    const dispatch = vi.fn();
    const dispose = registerEspBridge({
      router,
      modelId: 'm',
      eventTypes: [KEY_PRESSED],
      dispatch,
    });
    router.publishEvent('m', 'UNOBSERVED', {});
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'UNOBSERVED' }));
    dispose();
  });

  it('cancels events at the preview stage when a filter rejects them', () => {
    const router = new Router();
    const stages: EspStageInfo['stage'][] = [];
    const dispatch = vi.fn();
    const dispose = registerEspBridge({
      router,
      modelId: 'f',
      eventTypes: [KEY_PRESSED],
      dispatch,
      forwardLifecycle: false,
      filters: { [KEY_PRESSED]: (event) => (event as { key: string }).key !== 'Escape' },
      commitEventTypes: [KEY_PRESSED],
      onStage: (info) => stages.push(info.stage),
    });

    router.publishEvent('f', KEY_PRESSED, { key: 'Escape' });
    expect(dispatch).not.toHaveBeenCalled();
    expect(stages).toContain('canceled');

    stages.length = 0;
    router.publishEvent('f', KEY_PRESSED, { key: 'a' });
    expect(dispatch).toHaveBeenCalledWith({ type: KEY_PRESSED, payload: { key: 'a' } });
    expect(stages).toEqual([
      'preProcess',
      'preview',
      'normal',
      'committed',
      'final',
      'postProcess',
    ]);
    dispose();
  });

  it('guards the router: a throwing reducer is reported instead of halting esp-js', () => {
    const router = new Router();
    const onError = vi.fn();
    const dispatch = vi.fn((action: { type: string }) => {
      if (action.type === KEY_PRESSED) throw new Error('reducer bug');
    });
    const dispose = registerEspBridge({
      router,
      modelId: 'g',
      eventTypes: [KEY_PRESSED],
      dispatch,
      onError,
    });
    router.publishEvent('g', KEY_PRESSED, { key: 'a' });
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ eventType: KEY_PRESSED }),
    );
    // The router is still healthy and keeps routing.
    expect(router.currentStatus).not.toBe('halted');
    router.publishEvent('g', KEY_PRESSED, { key: 'b' });
    expect(onError).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('refuses to register the same model id twice', () => {
    const router = new Router();
    const dispose = registerEspBridge({
      router,
      modelId: 'dup',
      eventTypes: [],
      dispatch: vi.fn(),
    });
    expect(() =>
      registerEspBridge({ router, modelId: 'dup', eventTypes: [], dispatch: vi.fn() }),
    ).toThrow(/already registered/);
    dispose();
  });

  it('reports publishes that the router rejects', () => {
    const router = new Router();
    const onError = vi.fn();
    const store = createReducerStore(reducer, initialState, [
      createEspMiddleware({ router, modelId: 'never-registered', onError }),
    ]);
    store.dispatch(espPublish(KEY_PRESSED, { key: 'a' }));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/not registered/) }),
      expect.objectContaining({ type: types.PUBLISH_ACTION }),
    );
  });
});

describe('useEspReducer', () => {
  function Tile({ name }: { name: string }) {
    const [state, , esp] = useEspReducer(reducer, initialState, {
      modelName: name,
      observedEvents: [KEY_PRESSED],
    });
    return (
      <section aria-label={name}>
        <p>keys: {state.keys.join(',') || 'none'}</p>
        <button type="button" onClick={() => esp.publish(KEY_PRESSED, { key: 'P' })}>
          publish
        </button>
        <button type="button" onClick={() => esp.broadcast(KEY_PRESSED, { key: 'B' })}>
          broadcast
        </button>
      </section>
    );
  }

  function withRouter(router: Router) {
    return ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <EspRouterProvider router={router}>{children}</EspRouterProvider>
      </StrictMode>
    );
  }

  it('connects components through the router and survives Strict Mode remounts', async () => {
    const user = userEvent.setup();
    const router = new Router();
    render(
      <>
        <Tile name="left" />
        <Tile name="right" />
      </>,
      { wrapper: withRouter(router) },
    );
    const left = screen.getByRole('region', { name: 'left' });
    const right = screen.getByRole('region', { name: 'right' });

    await user.click(left.querySelector('button')!);
    expect(left).toHaveTextContent('keys: P');
    expect(right).toHaveTextContent('keys: none');

    await user.click(right.querySelectorAll('button')[1]!);
    expect(left).toHaveTextContent('keys: P,B');
    expect(right).toHaveTextContent('keys: B');
  });

  it('removes its model from the router on unmount', () => {
    const router = new Router();
    const { result, unmount } = renderHook(
      () =>
        useEspReducer(reducer, initialState, { modelName: 'tile', observedEvents: [KEY_PRESSED] }),
      { wrapper: withRouter(router) },
    );
    const { modelId } = result.current[2];
    expect(router.isModelRegistered(modelId)).toBe(true);
    act(() => result.current[2].publish(KEY_PRESSED, { key: 'x' }));
    expect(result.current[0].keys).toEqual(['x']);
    unmount();
    expect(router.isModelRegistered(modelId)).toBe(false);
  });
});
