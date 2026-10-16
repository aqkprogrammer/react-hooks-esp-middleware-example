// Public exports for the "storage" hook category. Keep alphabetical.
export {
  type SetStorageValue,
  type StorageError,
  type StorageErrorKind,
  type StorageStateOptions,
  type StorageStateResult,
} from './storageState';
export {
  useBroadcastChannel,
  type UseBroadcastChannelOptions,
  type UseBroadcastChannelResult,
} from './useBroadcastChannel';
export {
  parseCookies,
  serializeCookie,
  useCookie,
  type CookieError,
  type CookieErrorKind,
  type CookieOptions,
  type UseCookieOptions,
  type UseCookieResult,
} from './useCookie';
export { useCrossTabState, type UseCrossTabStateOptions } from './useCrossTabState';
export { useLocalStorage } from './useLocalStorage';
export {
  createMemoryAdapter,
  usePersistentState,
  webStorageAdapter,
  type PersistenceAdapter,
  type PersistentStateError,
  type PersistentStateErrorKind,
  type UsePersistentStateOptions,
} from './usePersistentState';
export { useSessionStorage } from './useSessionStorage';
