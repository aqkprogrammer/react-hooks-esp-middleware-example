/** A tiny pixel canvas: the reducer knows nothing about undo/redo. */
export const SIZE = 6;

export interface Canvas {
  /** Row-major cell flags. */
  cells: readonly boolean[];
  /** The last painted cell; changing it alone is not worth an undo step. */
  cursor: number | null;
}

export type CanvasAction =
  | { type: 'toggle'; index: number }
  | { type: 'focus'; index: number }
  | { type: 'fillRow'; row: number }
  | { type: 'clear' };

export const blankCanvas: Canvas = { cells: Array<boolean>(SIZE * SIZE).fill(false), cursor: null };

export function canvasReducer(state: Canvas, action: CanvasAction): Canvas {
  switch (action.type) {
    case 'toggle':
      return {
        cells: state.cells.map((on, index) => (index === action.index ? !on : on)),
        cursor: action.index,
      };
    case 'focus':
      return state.cursor === action.index ? state : { ...state, cursor: action.index };
    case 'fillRow': {
      const start = action.row * SIZE;
      const cells = state.cells.map((on, index) => on || (index >= start && index < start + SIZE));
      return cells.every((on, index) => on === state.cells[index]) ? state : { ...state, cells };
    }
    case 'clear':
      return state.cells.some(Boolean) ? { ...state, cells: blankCanvas.cells } : state;
  }
}
