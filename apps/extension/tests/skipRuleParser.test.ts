import { describe, expect, test } from 'bun:test';
import type { SponsorSegment } from '../src/types/types';
import { createRule, describeRule, evaluateRules } from '../src/utils/skipRuleParser';

const mockSegment: SponsorSegment = {
  uuid: 'test-uuid',
  startTime: 30,
  endTime: 60,
  category: 'sponsor',
  confidence: 1.0,
  source: 'ai-server',
  actionType: 'skip',
};

describe('evaluateRules', () => {
  test('returns null when no rules match', () => {
    const result = evaluateRules(mockSegment, []);
    expect(result).toBeNull();
  });

  test('returns action for matching rule', () => {
    const rules = [
      createRule({ attribute: 'category', operator: '==', value: 'sponsor', action: 'mute' }),
    ];
    expect(evaluateRules(mockSegment, rules)).toBe('mute');
  });

  test('skips disabled rules', () => {
    const rules = [
      {
        ...createRule({
          attribute: 'category',
          operator: '==',
          value: 'sponsor',
          action: 'auto-skip',
        }),
        enabled: false,
      },
    ];
    expect(evaluateRules(mockSegment, rules)).toBeNull();
  });

  test('returns first matching rule action', () => {
    const rules = [
      createRule({ attribute: 'category', operator: '==', value: 'shoutout', action: 'mute' }),
      createRule({ attribute: 'category', operator: '==', value: 'sponsor', action: 'auto-skip' }),
    ];
    expect(evaluateRules(mockSegment, rules)).toBe('auto-skip');
  });

  test('numeric operators work', () => {
    const rules = [
      createRule({ attribute: 'duration', operator: '>', value: 20, action: 'disabled' }),
    ];
    expect(evaluateRules(mockSegment, rules)).toBe('disabled');
  });

  test('numeric operators return null when no match', () => {
    const rules = [
      createRule({ attribute: 'duration', operator: '<', value: 20, action: 'disabled' }),
    ];
    expect(evaluateRules(mockSegment, rules)).toBeNull();
  });

  test('contains operator works', () => {
    const rules = [
      createRule({ attribute: 'category', operator: 'contains', value: 'spon', action: 'manual' }),
    ];
    expect(evaluateRules(mockSegment, rules)).toBe('manual');
  });

  test('startTime attribute works', () => {
    const rules = [
      createRule({ attribute: 'startTime', operator: '==', value: 30, action: 'auto-skip' }),
    ];
    expect(evaluateRules(mockSegment, rules)).toBe('auto-skip');
  });

  test('endTime attribute works', () => {
    const rules = [
      createRule({ attribute: 'endTime', operator: '>=', value: 60, action: 'auto-skip' }),
    ];
    expect(evaluateRules(mockSegment, rules)).toBe('auto-skip');
  });
});

describe('createRule', () => {
  test('creates rule with defaults', () => {
    const rule = createRule();
    expect(rule.enabled).toBe(true);
    expect(rule.attribute).toBe('category');
    expect(rule.operator).toBe('==');
    expect(rule.value).toBe('sponsor');
    expect(rule.action).toBe('auto-skip');
    expect(rule.id).toStartWith('rule_');
  });

  test('merges with partial overrides', () => {
    const rule = createRule({ attribute: 'duration', value: 10 });
    expect(rule.attribute).toBe('duration');
    expect(rule.value).toBe(10);
    expect(rule.enabled).toBe(true);
  });
});

describe('describeRule', () => {
  test('formats string value with quotes', () => {
    const rule = createRule({ attribute: 'category', operator: '==', value: 'sponsor' });
    expect(describeRule(rule)).toBe('if category == "sponsor" → auto skip');
  });

  test('formats numeric value with s suffix', () => {
    const rule = createRule({ attribute: 'duration', operator: '>', value: 30 });
    expect(describeRule(rule)).toBe('if duration > 30s → auto skip');
  });
});
