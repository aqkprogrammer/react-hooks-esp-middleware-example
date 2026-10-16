import { describe, expect, it } from 'vitest';
import { isAbortError, toError } from './env';

describe('toError', () => {
  it('returns Error instances unchanged', () => {
    const error = new TypeError('boom');
    expect(toError(error)).toBe(error);
  });

  it('keeps name and message of error-like objects such as cross-realm DOMExceptions', () => {
    const error = toError({ name: 'NotAllowedError', message: 'Permission denied' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotAllowedError');
    expect(error.message).toBe('Permission denied');
  });

  it('wraps strings and serialises other values', () => {
    expect(toError('nope').message).toBe('nope');
    expect(toError({ code: 42 }).message).toBe('{"code":42}');
  });
});

describe('isAbortError', () => {
  it('detects AbortError DOMExceptions and errors', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    expect(isAbortError(new Error('other'))).toBe(false);
  });
});
