import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { installIntersectionObserver } from '../../test/browserMocks';
import {
  useIntersectionObserver,
  type UseIntersectionObserverOptions,
} from './useIntersectionObserver';

function Target(props: UseIntersectionObserverOptions) {
  const { ref, isIntersecting, entry, isSupported } =
    useIntersectionObserver<HTMLDivElement>(props);
  return (
    <div ref={ref} data-testid="target">
      {`${isIntersecting ? 'visible' : 'hidden'}|ratio:${entry?.intersectionRatio ?? '-'}|supported:${isSupported}`}
    </div>
  );
}

describe('useIntersectionObserver', () => {
  it('observes the element with the given options and reports entries', () => {
    const Observer = installIntersectionObserver();
    const onChange = vi.fn();
    render(<Target threshold={[0, 0.5]} rootMargin="10px" onChange={onChange} />);
    const target = screen.getByTestId('target');
    expect(target).toHaveTextContent('hidden|ratio:-|supported:true');

    const observer = Observer.instances.at(-1);
    expect(observer?.thresholds).toEqual([0, 0.5]);
    expect(observer?.rootMargin).toBe('10px');
    expect(observer?.elements.has(target)).toBe(true);

    Observer.triggerAll(target, true);
    expect(target).toHaveTextContent('visible|ratio:1');
    Observer.triggerAll(target, false);
    expect(target).toHaveTextContent('hidden|ratio:0');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('does not re-observe when an equal threshold array is passed again', () => {
    const Observer = installIntersectionObserver();
    const { rerender } = render(<Target threshold={[0, 1]} />);
    rerender(<Target threshold={[0, 1]} />);
    expect(Observer.instances).toHaveLength(1);
    rerender(<Target threshold={[0.25]} />);
    expect(Observer.instances).toHaveLength(2);
    expect(Observer.instances[0]?.disconnected).toBe(true);
  });

  it('disconnects once visible when freezeOnceVisible is set', () => {
    const Observer = installIntersectionObserver();
    render(<Target freezeOnceVisible />);
    const target = screen.getByTestId('target');
    Observer.triggerAll(target, true);
    expect(Observer.instances[0]?.disconnected).toBe(true);
    expect(Observer.instances.filter((observer) => !observer.disconnected)).toHaveLength(0);
    expect(target).toHaveTextContent('visible');
  });

  it('disconnects on unmount and when disabled', () => {
    const Observer = installIntersectionObserver();
    const { rerender, unmount } = render(<Target />);
    rerender(<Target enabled={false} />);
    expect(Observer.instances[0]?.disconnected).toBe(true);
    rerender(<Target />);
    unmount();
    expect(Observer.instances.every((observer) => observer.disconnected)).toBe(true);
  });

  it('reports unsupported browsers and falls back to initialIsIntersecting', () => {
    // jsdom has no IntersectionObserver.
    render(<Target initialIsIntersecting />);
    expect(screen.getByTestId('target')).toHaveTextContent('visible|ratio:-|supported:false');
  });
});
