// Public exports for the "advanced" hook category. Keep alphabetical.
export {
  createEmitter,
  type EmitArgs,
  type Emitter,
  type EmitterHandler,
  type EmitterEventMap,
} from './createEmitter';
export {
  createStore,
  type StateInitializer,
  type StatePatch,
  type ExternalStore,
  type ExternalStoreListener,
} from './createStore';
export { FeatureFlagProvider, type FeatureFlagProviderProps } from './FeatureFlagProvider';
export {
  defineFeatureFlags,
  pickKnownFlags,
  type DefineFeatureFlagsOptions,
  type FeatureFlagDefinition,
  type FeatureFlagStatus,
  type FeatureFlagsValue,
  type FlagSource,
  type FlagValue,
  type FlagValues,
} from './featureFlags';
export { useEventEmitter } from './useEventEmitter';
export {
  shallowEqualObjects,
  useExternalStore,
  type SelectionEqualityFn,
} from './useExternalStore';
export { useFeatureFlag, useFeatureFlags } from './useFeatureFlag';
export {
  useObservable,
  type ObservableLike,
  type ObservableState,
  type ObservableStatus,
  type ObserverLike,
} from './useObservable';
export {
  useOptimisticMutation,
  type OptimisticMutationOutcome,
  type OptimisticMutation,
  type OptimisticPendingMutation,
  type UseOptimisticMutationOptions,
} from './useOptimisticMutation';
export {
  usePerformanceMeasure,
  type MeasurementStatus,
  type PerformanceMeasureControls,
  type PerformanceMeasurement,
  type UsePerformanceMeasureOptions,
} from './usePerformanceMeasure';
export {
  usePermission,
  type PermissionQueryName,
  type PermissionResult,
  type PermissionStatusResult,
} from './usePermission';
export {
  machineTransition,
  useStateMachine,
  type EntryActionArgs,
  type MachineConfig,
  type MachineEvent,
  type MachineSnapshot,
  type StateMachine,
  type StateNodeConfig,
  type MachineTransition,
  type MachineTransitionConfig,
} from './useStateMachine';
export {
  useSubscription,
  type SubscriptionSource,
  type UseSubscriptionOptions,
} from './useSubscription';
export {
  useWebWorker,
  type UseWebWorkerOptions,
  type WebWorkerControls,
  type WorkerSource,
} from './useWebWorker';
