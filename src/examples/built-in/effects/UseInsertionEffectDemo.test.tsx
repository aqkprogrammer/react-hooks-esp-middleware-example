import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseInsertionEffectDemo from './UseInsertionEffectDemo';
import { hashCss, scopedRule, useScopedCss } from './useScopedCss';

const styleTags = () => Array.from(document.head.querySelectorAll('style[data-scoped-css]'));

describe('useScopedCss', () => {
  it('hashes declarations into a stable class name', () => {
    expect(hashCss('color: red;')).toBe(hashCss('color: red;'));
    expect(hashCss('color: red;')).not.toBe(hashCss('color: blue;'));
    expect(scopedRule('color: red;').rule).toMatch(/^\.scoped-[0-9a-z]+ \{ color: red; \}$/);
  });

  it('injects one shared <style> tag and removes it after the last user unmounts', () => {
    const first = renderHook(() => useScopedCss('color: var(--accent);'));
    const second = renderHook(() => useScopedCss('color: var(--accent);'));
    expect(first.result.current).toBe(second.result.current);
    expect(styleTags()).toHaveLength(1);
    expect(styleTags()[0]?.textContent).toBe(`.${first.result.current} { color: var(--accent); }`);

    first.unmount();
    expect(styleTags()).toHaveLength(1);
    second.unmount();
    expect(styleTags()).toHaveLength(0);
  });

  it('swaps the rule when the declarations change', () => {
    const { rerender, unmount, result } = renderHook(({ css }) => useScopedCss(css), {
      initialProps: { css: 'padding: 4px;' },
    });
    const before = result.current;
    rerender({ css: 'padding: 8px;' });
    expect(result.current).not.toBe(before);
    expect(styleTags().map((tag) => tag.getAttribute('data-scoped-css'))).toEqual([result.current]);
    unmount();
  });
});

describe('UseInsertionEffectDemo', () => {
  it('styles boxes with the generated class and dedupes identical rules', async () => {
    const user = userEvent.setup();
    render(<UseInsertionEffectDemo />);
    const initialClass = screen.getByText('Box 1').className;
    expect(initialClass).toMatch(/^scoped-/);
    expect(styleTags()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Add a box with the same style' }));
    expect(screen.getByText('Box 2').className).toBe(initialClass);
    await user.click(screen.getByRole('button', { name: 'Inspect <head>' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      `1 injected <style> tag(s): ${initialClass}`,
    );

    await user.selectOptions(screen.getByLabelText('Tone'), 'danger');
    expect(screen.getByText('Box 1').className).not.toBe(initialClass);
    expect(styleTags()).toHaveLength(1);
    expect(styleTags()[0]?.textContent).toContain('var(--danger)');
  });

  it('removes the style tag when no box uses it', async () => {
    const user = userEvent.setup();
    render(<UseInsertionEffectDemo />);
    await user.click(screen.getByRole('button', { name: 'Remove a box' }));
    expect(styleTags()).toHaveLength(0);
  });
});
