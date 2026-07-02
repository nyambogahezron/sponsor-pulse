import { describe, expect, test } from 'bun:test';
import { urlTimeToSeconds } from '../src/utils/pageUtils';

describe('urlTimeToSeconds', () => {
  test('parses plain seconds', () => {
    expect(urlTimeToSeconds('120')).toBe(120);
  });

  test('parses mm:ss format', () => {
    expect(urlTimeToSeconds('2m30s')).toBe(150);
  });

  test('parses h:mm:ss format', () => {
    expect(urlTimeToSeconds('1h2m30s')).toBe(3750);
  });

  test('returns 0 for empty string', () => {
    expect(urlTimeToSeconds('')).toBe(0);
  });

  test('returns 0 for invalid input', () => {
    expect(urlTimeToSeconds('abc')).toBe(0);
  });

  test('parses just minutes', () => {
    expect(urlTimeToSeconds('5m')).toBe(300);
  });

  test('parses just hours', () => {
    expect(urlTimeToSeconds('2h')).toBe(7200);
  });
});
