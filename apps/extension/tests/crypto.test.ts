import { describe, expect, test } from 'bun:test';
import { getHashPrefix } from '../src/utils/crypto';

describe('getHashPrefix', () => {
  test('returns first 4 hex characters by default', async () => {
    const result = await getHashPrefix('test-video-id');
    expect(result).toHaveLength(4);
    expect(result).toMatch(/^[0-9a-f]{4}$/);
  });

  test('returns consistent results for same input', async () => {
    const [a, b] = await Promise.all([getHashPrefix('hello-world'), getHashPrefix('hello-world')]);
    expect(a).toBe(b);
  });

  test('different inputs produce different prefixes', async () => {
    const [a, b] = await Promise.all([getHashPrefix('video-1'), getHashPrefix('video-2')]);
    expect(a).not.toBe(b);
  });

  test('respects custom length', async () => {
    const result = await getHashPrefix('test', 8);
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  test('handles empty string', async () => {
    const result = await getHashPrefix('');
    expect(result).toHaveLength(4);
  });
});
