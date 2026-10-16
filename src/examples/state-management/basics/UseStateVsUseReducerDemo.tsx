import { useReducer, useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { bookingLimits, bookingReducer, initialBooking, MAX_SEATS, type Booking } from './booking';

/**
 * The same booking widget twice: once with two `useState` calls and the rules
 * spread across event handlers, once with `useReducer` and every rule in one
 * pure, testable reducer. Both behave identically — the difference is where
 * the logic lives.
 */
export default function UseStateVsUseReducerDemo() {
  return (
    <div className="stack">
      <p className="muted small">
        Rules: at most {MAX_SEATS} seats, children need an adult, and removing the last adult also
        removes the children. Click the same buttons in both panels.
      </p>
      <div className="grid">
        <WithUseState />
        <WithUseReducer />
      </div>
      <Callout title="Trade-off">
        <code>useState</code> is simpler for independent values. Once updates depend on other fields
        (here: removing the last adult clears the children), <code>useReducer</code> keeps each
        transition in one place, lets the reducer be unit-tested without React, and gives you a
        single stable <code>dispatch</code> to pass down.
      </Callout>
    </div>
  );
}

function WithUseState() {
  const [adults, setAdults] = useState(initialBooking.adults);
  const [children, setChildren] = useState(initialBooking.children);
  const limits = bookingLimits({ adults, children });

  // Each rule is re-implemented in its handler; the cross-field rule needs two setters.
  const removeAdult = () => {
    if (!limits.canRemoveAdult) return;
    setAdults(adults - 1);
    if (adults === 1) setChildren(0);
  };

  return (
    <Panel title="useState" description="Two state variables; rules live in the handlers.">
      <BookingView
        booking={{ adults, children }}
        onAddAdult={() => limits.canAddAdult && setAdults(adults + 1)}
        onRemoveAdult={removeAdult}
        onAddChild={() => limits.canAddChild && setChildren(children + 1)}
        onRemoveChild={() => limits.canRemoveChild && setChildren(children - 1)}
        onReset={() => {
          setAdults(initialBooking.adults);
          setChildren(initialBooking.children);
        }}
      />
    </Panel>
  );
}

function WithUseReducer() {
  const [booking, dispatch] = useReducer(bookingReducer, initialBooking);
  return (
    <Panel title="useReducer" description="One state object; rules live in bookingReducer.">
      <BookingView
        booking={booking}
        onAddAdult={() => dispatch({ type: 'addAdult' })}
        onRemoveAdult={() => dispatch({ type: 'removeAdult' })}
        onAddChild={() => dispatch({ type: 'addChild' })}
        onRemoveChild={() => dispatch({ type: 'removeChild' })}
        onReset={() => dispatch({ type: 'reset' })}
      />
    </Panel>
  );
}

interface BookingViewProps {
  booking: Booking;
  onAddAdult: () => void;
  onRemoveAdult: () => void;
  onAddChild: () => void;
  onRemoveChild: () => void;
  onReset: () => void;
}

function BookingView({ booking, ...handlers }: BookingViewProps) {
  const limits = bookingLimits(booking);
  return (
    <div className="stack">
      <ValueTable
        rows={{
          Adults: booking.adults,
          Children: booking.children,
          'Seats left': limits.seatsLeft,
        }}
      />
      {limits.seatsLeft === 0 ? <Badge tone="warn">Fully booked</Badge> : null}
      <div className="row">
        <Button onClick={handlers.onAddAdult} disabled={!limits.canAddAdult}>
          Add adult
        </Button>
        <Button onClick={handlers.onRemoveAdult} disabled={!limits.canRemoveAdult}>
          Remove adult
        </Button>
      </div>
      <div className="row">
        <Button onClick={handlers.onAddChild} disabled={!limits.canAddChild}>
          Add child
        </Button>
        <Button onClick={handlers.onRemoveChild} disabled={!limits.canRemoveChild}>
          Remove child
        </Button>
        <Button variant="ghost" onClick={handlers.onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
