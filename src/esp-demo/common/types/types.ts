export const types = {
  KEY_PRESSED: 'dtp-client-common_keyPressed',
} as const;

/** Payload of the cross-tile KEY_PRESSED esp-js event. */
export interface KeyPressedEvent {
  key: string;
}

export interface KeyPressedAction {
  type: typeof types.KEY_PRESSED;
  payload: KeyPressedEvent;
}
