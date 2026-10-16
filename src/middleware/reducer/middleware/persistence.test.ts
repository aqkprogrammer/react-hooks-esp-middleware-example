import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../createReducerStore';
import {
  createPersistenceMiddleware,
  defaultPersistenceStorage,
  hydrate,
  isQuotaExceededError,
  type PersistenceError,
  type PersistenceStorage,
} from './persistence';

interface State {
  items: string[];
  draft: string;
}
type Action = { type: 'add'; item: string } | { type: 'type'; draft: string };
const reducer = (state: State, action: Action): State =>
  action.type === 'add'
    ? { ...state, items: [...state.items, action.item] }
    : { ...state, draft: action.draft };

const initial: State = { items: [], draft: '' };
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

function memoryStorage(): PersistenceStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
  };
}

describe('createPersistenceMiddleware', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces writes of the selected slice and ignores unrelated changes', () => {
    const storage = memoryStorage();
    const onSaved = vi.fn();
    const persist = createPersistenceMiddleware<State, Action, string[]>({
      key: 'test:items',
      select: (state) => state.items,
      getStorage: () => storage,
      debounceMs: 200,
      onSaved,
    });
    const store = createReducerStore(reducer, initial, [persist]);
    store.dispatch({ type: 'type', draft: 'abc' });
    vi.advanceTimersByTime(500);
    expect(storage.setItem).not.toHaveBeenCalled();

    store.dispatch({ type: 'add', item: 'a' });
    vi.advanceTimersByTime(150);
    store.dispatch({ type: 'add', item: 'b' });
    vi.advanceTimersByTime(150);
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.data.get('test:items')).toBe('["a","b"]');
    expect(onSaved).toHaveBeenCalledWith(['a', 'b']);
  });

  it('flushes and cancels the pending write', () => {
    const storage = memoryStorage();
    const persist = createPersistenceMiddleware<State, Action, string[]>({
      key: 'k',
      select: (state) => state.items,
      getStorage: () => storage,
    });
    const store = createReducerStore(reducer, initial, [persist]);
    store.dispatch({ type: 'add', item: 'a' });
    persist.flush();
    expect(storage.data.get('k')).toBe('["a"]');
    persist.flush();
    expect(storage.setItem).toHaveBeenCalledTimes(1);

    store.dispatch({ type: 'add', item: 'b' });
    persist.cancel();
    vi.runAllTimers();
    expect(storage.data.get('k')).toBe('["a"]');
  });

  it('reports quota errors, keeps state, and retries on the next change', () => {
    const errors: PersistenceError[] = [];
    const storage = memoryStorage();
    vi.mocked(storage.setItem).mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const persist = createPersistenceMiddleware<State, Action, string[]>({
      key: 'k',
      select: (state) => state.items,
      getStorage: () => storage,
      onError: (error) => errors.push(error),
    });
    const store = createReducerStore(reducer, initial, [persist]);
    store.dispatch({ type: 'add', item: 'a' });
    vi.runAllTimers();
    expect(errors).toEqual([expect.objectContaining({ kind: 'quota', key: 'k' })]);
    expect(store.getState().items).toEqual(['a']);
    store.dispatch({ type: 'add', item: 'b' });
    vi.runAllTimers();
    expect(storage.data.get('k')).toBe('["a","b"]');
  });

  it('classifies other failures', () => {
    const errors: PersistenceError['kind'][] = [];
    const onError = (error: PersistenceError) => errors.push(error.kind);
    const failing = memoryStorage();
    vi.mocked(failing.setItem).mockImplementation(() => {
      throw new Error('denied');
    });
    const cases = [
      createPersistenceMiddleware<State, Action, string[]>({
        key: 'k',
        select: (s) => s.items,
        getStorage: () => null,
        onError,
      }),
      createPersistenceMiddleware<State, Action, string[]>({
        key: 'k',
        select: (s) => s.items,
        getStorage: () => failing,
        onError,
      }),
      createPersistenceMiddleware<State, Action, string[]>({
        key: 'k',
        select: (s) => s.items,
        getStorage: () => memoryStorage(),
        serialize: () => {
          throw new TypeError('circular');
        },
        onError,
      }),
    ];
    for (const persist of cases) {
      createReducerStore(reducer, initial, [persist]).dispatch({ type: 'add', item: 'x' });
      persist.flush();
    }
    expect(errors).toEqual(['unavailable', 'write', 'serialize']);
  });

  it('writes to localStorage by default', () => {
    const store = createReducerStore(reducer, initial, [
      createPersistenceMiddleware<State, Action, string[]>({
        key: 'default:k',
        select: (s) => s.items,
      }),
    ]);
    store.dispatch({ type: 'add', item: 'z' });
    vi.runAllTimers();
    expect(window.localStorage.getItem('default:k')).toBe('["z"]');
    expect(defaultPersistenceStorage()).toBe(window.localStorage);
  });
});

describe('hydrate', () => {
  it('returns the stored, validated slice', () => {
    window.localStorage.setItem('k', '["a"]');
    expect(hydrate({ key: 'k', validate: isStringArray })).toEqual(['a']);
  });

  it('returns undefined for missing, corrupt or invalid data', () => {
    const onError = vi.fn();
    expect(hydrate({ key: 'missing', validate: isStringArray, onError })).toBeUndefined();
    window.localStorage.setItem('corrupt', '{nope');
    expect(hydrate({ key: 'corrupt', validate: isStringArray, onError })).toBeUndefined();
    window.localStorage.setItem('wrong', '42');
    expect(hydrate({ key: 'wrong', validate: isStringArray, onError })).toBeUndefined();
    expect(onError.mock.calls.map(([error]) => error.kind)).toEqual(['parse', 'invalid']);
  });

  it('survives storage that throws on access', () => {
    const getStorage = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    expect(hydrate({ key: 'k', validate: isStringArray, getStorage })).toBeUndefined();
  });
});

describe('isQuotaExceededError', () => {
  it('recognises quota errors only', () => {
    expect(isQuotaExceededError(new DOMException('x', 'QuotaExceededError'))).toBe(true);
    expect(isQuotaExceededError(new DOMException('x', 'NS_ERROR_DOM_QUOTA_REACHED'))).toBe(true);
    expect(isQuotaExceededError(new DOMException('x', 'SecurityError'))).toBe(false);
    expect(isQuotaExceededError(new Error('QuotaExceededError'))).toBe(false);
  });
});
