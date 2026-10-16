// Documents a real compatibility limitation (see the esp-js catalog entries):
// esp-js 8 ships a UMD bundle that references the browser global `self` when
// it is first imported, so the integration is client-only.
import { describe, expect, it } from 'vitest';

describe('esp-js in a server (Node) environment', () => {
  it('cannot be imported without a `self` shim', async () => {
    expect(typeof self).toBe('undefined');
    await expect(import('esp-js')).rejects.toThrow(/self is not defined/);
  });
});
