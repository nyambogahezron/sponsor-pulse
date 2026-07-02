import { describe, expect, test } from 'bun:test';
import { partition } from '../src/utils/arrayUtils';

describe('partition', () => {
  test('splits array based on predicate', () => {
    const [even, odd] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
    expect(even).toEqual([2, 4]);
    expect(odd).toEqual([1, 3, 5]);
  });

  test('returns empty arrays for empty input', () => {
    const [pass, fail] = partition([], () => true);
    expect(pass).toEqual([]);
    expect(fail).toEqual([]);
  });

  test('puts all in pass when predicate always true', () => {
    const [pass, fail] = partition([1, 2, 3], () => true);
    expect(pass).toEqual([1, 2, 3]);
    expect(fail).toEqual([]);
  });

  test('preserves order within each partition', () => {
    const [pass, fail] = partition(['a', 'b', 'c', 'd'], (s) => s === 'a' || s === 'c');
    expect(pass).toEqual(['a', 'c']);
    expect(fail).toEqual(['b', 'd']);
  });
});
