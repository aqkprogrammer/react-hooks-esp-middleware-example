import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { useAnnouncer, useKeyboardShortcut, useReducedMotion } from '../../../hooks';
import { announcements, computeDropIndex, moveItem, shiftFor } from './reorder';
import './DragAndDropScenario.css';

interface Task {
  id: string;
  title: string;
}

const INITIAL_TASKS: readonly Task[] = [
  { id: 'audit', title: 'Accessibility audit' },
  { id: 'search', title: 'Search performance' },
  { id: 'offline', title: 'Offline mode' },
  { id: 'billing', title: 'Billing page redesign' },
  { id: 'export', title: 'CSV export' },
  { id: 'onboarding', title: 'Onboarding checklist' },
];

type DragState =
  | { mode: 'idle' }
  | {
      mode: 'pointer';
      id: string;
      pointerId: number;
      from: number;
      to: number;
      startY: number;
      dy: number;
      /** Item midpoints measured once at drag start (before any transform). */
      midpoints: number[];
      /** Height of the dragged item plus the gap: how far neighbours shift. */
      distance: number;
    }
  | { mode: 'keyboard'; id: string; from: number; original: readonly Task[] };

const IDLE: DragState = { mode: 'idle' };

/**
 * A sortable list with three ways to reorder:
 * - pointer drag on the handle (mouse, pen and touch via Pointer Events),
 * - keyboard: Space/Enter to grab, arrows to move, Space/Enter to drop, Escape to cancel,
 * - single-click "Move up/down" buttons (WCAG 2.5.7 Dragging Movements).
 */
export default function DragAndDropScenario() {
  const [tasks, setTasks] = useState<readonly Task[]>(INITIAL_TASKS);
  const [drag, setDrag] = useState<DragState>(IDLE);
  const { announce } = useAnnouncer();
  const reducedMotion = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const instructionsId = useId();
  const total = tasks.length;
  const titleOf = (id: string) => tasks.find((task) => task.id === id)?.title ?? id;

  // Keep focus (and the viewport) on the grabbed item while it moves: React
  // re-orders DOM nodes, which can drop focus in some browsers.
  const grabbedId = drag.mode === 'keyboard' ? drag.id : null;
  useLayoutEffect(() => {
    if (!grabbedId) return;
    const handle = handles.current.get(grabbedId);
    if (!handle) return;
    if (document.activeElement !== handle) handle.focus();
    if (typeof handle.scrollIntoView === 'function') {
      handle.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [grabbedId, tasks, reducedMotion]);

  const cancelPointerDrag = () => {
    if (drag.mode !== 'pointer') return;
    setDrag(IDLE);
    announce(announcements.canceled(titleOf(drag.id), drag.from + 1, total));
  };
  useKeyboardShortcut('escape', cancelPointerDrag, {
    enabled: drag.mode === 'pointer',
    allowInInputs: true,
  });

  // ---- Pointer --------------------------------------------------------------
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, index: number, id: string) => {
    if (drag.mode !== 'idle' || !event.isPrimary || event.button !== 0) return;
    const nodes = listRef.current?.querySelectorAll<HTMLElement>('[data-sortable-item]');
    if (!nodes || nodes.length !== total) return;
    const rects = Array.from(nodes, (node) => node.getBoundingClientRect());
    const dragged = rects[index];
    if (!dragged) return;
    const first = rects[0];
    const second = rects[1];
    const gap = first && second ? Math.max(0, second.top - first.bottom) : 0;
    event.preventDefault();
    // Capture: moves/ups keep coming to the handle even when the pointer leaves it.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({
      mode: 'pointer',
      id,
      pointerId: event.pointerId,
      from: index,
      to: index,
      startY: event.clientY,
      dy: 0,
      midpoints: rects.map((rect) => rect.top + rect.height / 2),
      distance: dragged.height + gap,
    });
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.mode !== 'pointer' || event.pointerId !== drag.pointerId) return;
    const dy = event.clientY - drag.startY;
    const center = (drag.midpoints[drag.from] ?? 0) + dy;
    setDrag({ ...drag, dy, to: computeDropIndex(drag.midpoints, drag.from, center) });
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.mode !== 'pointer' || event.pointerId !== drag.pointerId) return;
    setTasks((current) => moveItem(current, drag.from, drag.to));
    setDrag(IDLE);
    if (drag.to !== drag.from)
      announce(announcements.dropped(titleOf(drag.id), drag.to + 1, total));
  };

  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.mode === 'pointer' && event.pointerId === drag.pointerId) cancelPointerDrag();
  };

  // ---- Keyboard -------------------------------------------------------------
  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number, id: string) => {
    const title = titleOf(id);
    if (drag.mode === 'idle') {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setDrag({ mode: 'keyboard', id, from: index, original: tasks });
        announce(announcements.grabbed(title, index + 1, total));
      }
      return;
    }
    if (drag.mode !== 'keyboard' || drag.id !== id) return;
    const moveTo = (target: number) => {
      event.preventDefault();
      if (target < 0 || target >= total) {
        announce(announcements.edge(title, target < 0 ? 'top' : 'bottom'));
        return;
      }
      if (target === index) return;
      setTasks((current) => moveItem(current, index, target));
      announce(announcements.moved(title, target + 1, total));
    };
    switch (event.key) {
      case 'ArrowUp':
        moveTo(index - 1);
        break;
      case 'ArrowDown':
        moveTo(index + 1);
        break;
      case 'Home':
        moveTo(index === 0 ? -1 : 0);
        break;
      case 'End':
        moveTo(index === total - 1 ? total : total - 1);
        break;
      case ' ':
      case 'Enter':
      case 'Tab':
        // Tab drops and lets focus move on, so the user is never "stuck" holding an item.
        if (event.key !== 'Tab') event.preventDefault();
        setDrag(IDLE);
        announce(announcements.dropped(title, index + 1, total));
        break;
      case 'Escape': {
        event.preventDefault();
        setTasks(drag.original);
        setDrag(IDLE);
        announce(announcements.canceled(title, drag.from + 1, total));
        break;
      }
    }
  };

  // ---- Single-pointer alternative -------------------------------------------
  const moveByButton = (index: number, delta: -1 | 1) => {
    const task = tasks[index];
    const target = index + delta;
    if (!task || target < 0 || target >= total) return;
    setTasks(moveItem(tasks, index, target));
    announce(announcements.moved(task.title, target + 1, total));
  };

  const itemStyle = (index: number): CSSProperties | undefined => {
    if (drag.mode !== 'pointer') return undefined;
    const offset =
      index === drag.from ? drag.dy : shiftFor(index, drag.from, drag.to, drag.distance);
    return offset ? { transform: `translateY(${offset}px)` } : undefined;
  };

  const listClasses = [
    'sortable-list',
    drag.mode === 'pointer' ? 'sortable-list-dragging' : '',
    reducedMotion ? 'sortable-list-reduced-motion' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="stack">
      <Panel
        title="Release priorities"
        description="Drag a handle, use the keyboard, or the move buttons. The order is announced to screen readers."
      >
        <p id={instructionsId} className="small muted">
          Keyboard: focus a handle, press <kbd className="kbd">Space</kbd> to grab,{' '}
          <kbd className="kbd">↑</kbd>/<kbd className="kbd">↓</kbd> to move,{' '}
          <kbd className="kbd">Space</kbd> to drop, <kbd className="kbd">Esc</kbd> to cancel.
        </p>
        <ol ref={listRef} className={listClasses} aria-label="Release priorities">
          {tasks.map((task, index) => {
            const isPointerDragged = drag.mode === 'pointer' && drag.id === task.id;
            const isGrabbed = drag.mode === 'keyboard' && drag.id === task.id;
            return (
              <li
                key={task.id}
                data-sortable-item=""
                className={[
                  'sortable-item',
                  isPointerDragged ? 'sortable-item-lifted' : '',
                  isGrabbed ? 'sortable-item-grabbed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={itemStyle(index)}
              >
                <button
                  type="button"
                  className="sortable-handle"
                  ref={(node) => {
                    if (node) handles.current.set(task.id, node);
                    else handles.current.delete(task.id);
                  }}
                  aria-label={`Reorder ${task.title}`}
                  aria-describedby={instructionsId}
                  aria-pressed={isGrabbed}
                  onPointerDown={(event) => onPointerDown(event, index, task.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  onLostPointerCapture={onPointerCancel}
                  onKeyDown={(event) => onHandleKeyDown(event, index, task.id)}
                >
                  <span aria-hidden="true">⠿</span>
                </button>
                <span className="sortable-position mono" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="sortable-title">{task.title}</span>
                {isGrabbed ? <Badge tone="info">grabbed</Badge> : null}
                <span className="sortable-buttons">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${task.title} up`}
                    disabled={index === 0 || drag.mode !== 'idle'}
                    onClick={() => moveByButton(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${task.title} down`}
                    disabled={index === total - 1 || drag.mode !== 'idle'}
                    onClick={() => moveByButton(index, 1)}
                  >
                    ↓
                  </Button>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="row">
          <Button
            onClick={() => {
              setTasks(INITIAL_TASKS);
              setDrag(IDLE);
              announce('Order reset.');
            }}
          >
            Reset order
          </Button>
          <span className="small muted">
            Reduced motion: <strong>{reducedMotion ? 'on' : 'off'}</strong> (from your OS setting)
          </span>
        </div>
      </Panel>
      <Callout title="Why Pointer Events instead of the HTML5 drag-and-drop API">
        The native <code>draggable</code> API does not fire on most touch screens, cannot be styled
        while dragging and has no keyboard story. Pointer Events with <code>setPointerCapture</code>{' '}
        and <code>touch-action: none</code> on the handle work the same for mouse, pen and touch.
        The keyboard mode and the move buttons are separate, first-class paths, not afterthoughts.
      </Callout>
    </div>
  );
}
