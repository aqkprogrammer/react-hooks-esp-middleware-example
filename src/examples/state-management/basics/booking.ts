/**
 * The booking rules shared by both implementations in UseStateVsUseReducerDemo:
 * at most MAX_SEATS people, children need at least one adult, and removing the
 * last adult also removes the children.
 */
export const MAX_SEATS = 6;

export interface Booking {
  adults: number;
  children: number;
}

export type BookingAction =
  | { type: 'addAdult' }
  | { type: 'removeAdult' }
  | { type: 'addChild' }
  | { type: 'removeChild' }
  | { type: 'reset' };

export const initialBooking: Booking = { adults: 1, children: 0 };

/** What the UI may offer for a given booking (shared by both versions). */
export function bookingLimits({ adults, children }: Booking) {
  const seatsLeft = MAX_SEATS - adults - children;
  return {
    seatsLeft,
    canAddAdult: seatsLeft > 0,
    canRemoveAdult: adults > 0,
    canAddChild: seatsLeft > 0 && adults > 0,
    canRemoveChild: children > 0,
  };
}

/**
 * Every rule lives in one pure function: easy to read, unit test and reuse.
 * Disallowed actions return the *same* state object, so React bails out of
 * the re-render.
 */
export function bookingReducer(state: Booking, action: BookingAction): Booking {
  const limits = bookingLimits(state);
  switch (action.type) {
    case 'addAdult':
      return limits.canAddAdult ? { ...state, adults: state.adults + 1 } : state;
    case 'removeAdult':
      if (!limits.canRemoveAdult) return state;
      return state.adults === 1
        ? { adults: 0, children: 0 }
        : { ...state, adults: state.adults - 1 };
    case 'addChild':
      return limits.canAddChild ? { ...state, children: state.children + 1 } : state;
    case 'removeChild':
      return limits.canRemoveChild ? { ...state, children: state.children - 1 } : state;
    case 'reset':
      return initialBooking;
  }
}
