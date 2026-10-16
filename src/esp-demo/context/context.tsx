import { createContext, use, useMemo, useState, type ReactNode } from 'react';
import { useEspReducer, type EspStoreHandle } from '../../middleware/esp-js';
import type { Dispatch, Middleware } from '../../middleware/reducer/types';
import { createFormValidationMiddleware } from '../common/middleware/formValidationMiddleware';
import { useEspTrace } from '../trace';
import { createActions, type WorkspaceActions } from './actions';
import { localStorageMiddleware } from './middleware/localStorageMiddleware';
import { loginMiddleware } from './middleware/loginMiddleware';
import { createInitialState, reducer, type WorkspaceState } from './reducers';
import type { LoginErrors, WorkspaceAction, WorkspaceOwnAction } from './types';
import { validationMap } from './validation';

export interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  actions: WorkspaceActions;
  esp: EspStoreHandle;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const value = use(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return value;
}

/**
 * Middleware order is the same as the original chain
 * (validation → localStorage → login → esp → reducer): the first entry sees
 * every action first; the ESP middleware is appended last by useEspReducer.
 */
const workspaceMiddleware: ReadonlyArray<Middleware<WorkspaceState, WorkspaceAction>> = [
  createFormValidationMiddleware<WorkspaceState, WorkspaceAction, LoginErrors>(
    validationMap,
  ) as Middleware<WorkspaceState, WorkspaceAction>,
  localStorageMiddleware,
  loginMiddleware,
];

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const trace = useEspTrace();
  const [initialState] = useState(createInitialState);
  const [state, dispatch, esp] = useEspReducer<WorkspaceState, WorkspaceOwnAction>(
    reducer,
    initialState,
    {
      modelName: 'workspace',
      observedEvents: [],
      middleware: workspaceMiddleware,
      ...(trace ? { onStage: trace } : {}),
    },
  );
  const actions = useMemo(() => createActions(dispatch), [dispatch]);
  const value = useMemo(() => ({ state, dispatch, actions, esp }), [state, dispatch, actions, esp]);

  // We could provide the espRouter to the application if required here.
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
};
