/**
 * A framework-agnostic "third-party" widget with an imperative API — the
 * kind of library (maps, charts, editors, date pickers) React has to wrap.
 * It owns the DOM inside `container` and must be destroyed explicitly.
 */
export interface StarRatingOptions {
  max: number;
  onChange: (value: number) => void;
}

export interface StarRatingWidget {
  setValue(value: number): void;
  getValue(): number;
  destroy(): void;
}

export function createStarRating(
  container: HTMLElement,
  { max, onChange }: StarRatingOptions,
): StarRatingWidget {
  let value = 0;
  const root = document.createElement('div');
  root.className = 'star-rating-widget';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Rating widget');

  const buttons = Array.from({ length: max }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'star-rating-widget-star';
    button.textContent = '★';
    button.setAttribute('aria-label', `${index + 1} star${index === 0 ? '' : 's'}`);
    button.addEventListener('click', () => {
      render(index + 1);
      onChange(index + 1);
    });
    root.appendChild(button);
    return button;
  });

  function render(next: number) {
    value = Math.max(0, Math.min(max, next));
    buttons.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index < value));
    });
  }

  render(0);
  container.appendChild(root);

  return {
    setValue: render,
    getValue: () => value,
    destroy() {
      root.remove(); // also drops the button listeners with the nodes
    },
  };
}
