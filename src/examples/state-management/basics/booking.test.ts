import { describe, expect, it } from 'vitest';
import { bookingReducer, initialBooking, MAX_SEATS, type Booking } from './booking';

const run = (state: Booking, ...types: Parameters<typeof bookingReducer>[1]['type'][]) =>
  types.reduce((current, type) => bookingReducer(current, { type }), state);

describe('bookingReducer', () => {
  it('caps the total number of seats', () => {
    const full = run(initialBooking, ...Array<'addAdult'>(10).fill('addAdult'));
    expect(full.adults).toBe(MAX_SEATS);
    expect(bookingReducer(full, { type: 'addChild' })).toBe(full);
  });

  it('requires an adult for children and removes children with the last adult', () => {
    const state = run(initialBooking, 'addChild', 'addChild');
    expect(state).toEqual({ adults: 1, children: 2 });
    const empty = run(state, 'removeAdult');
    expect(empty).toEqual({ adults: 0, children: 0 });
    expect(bookingReducer(empty, { type: 'addChild' })).toBe(empty);
    expect(bookingReducer(empty, { type: 'removeAdult' })).toBe(empty);
  });

  it('resets', () => {
    expect(run(initialBooking, 'addAdult', 'reset')).toBe(initialBooking);
  });
});
