import type { SkipRule } from '../types/storage';
import type { SponsorSegment } from '../types/types';

type AttributeValue = string | number;

function getAttributeValue(
  segment: SponsorSegment,
  attribute: SkipRule['attribute'],
): AttributeValue {
  switch (attribute) {
    case 'category':
      return segment.category;
    case 'duration':
      return segment.endTime - segment.startTime;
    case 'startTime':
      return segment.startTime;
    case 'endTime':
      return segment.endTime;
  }
}

function evaluateOperator(
  actual: AttributeValue,
  operator: SkipRule['operator'],
  expected: SkipRule['value'],
): boolean {
  switch (operator) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '>':
      return typeof actual === 'number' && actual > Number(expected);
    case '<':
      return typeof actual === 'number' && actual < Number(expected);
    case '>=':
      return typeof actual === 'number' && actual >= Number(expected);
    case '<=':
      return typeof actual === 'number' && actual <= Number(expected);
    case 'contains':
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
  }
}

export function evaluateRules(
  segment: SponsorSegment,
  rules: SkipRule[],
): SkipRule['action'] | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const actual = getAttributeValue(segment, rule.attribute);
    if (evaluateOperator(actual, rule.operator, rule.value)) return rule.action;
  }
  return null;
}

let ruleIdCounter = 0;

export function createRule(partial: Partial<Omit<SkipRule, 'id'>> = {}): SkipRule {
  return {
    id: `rule_${Date.now()}_${ruleIdCounter++}`,
    enabled: true,
    attribute: 'category',
    operator: '==',
    value: 'sponsor',
    action: 'auto-skip',
    label: '',
    ...partial,
  };
}

export async function saveRules(rules: SkipRule[]): Promise<void> {
  await chrome.storage.local.set({ skipRules: rules });
}

export async function loadRules(): Promise<SkipRule[]> {
  const { skipRules = [] } = (await chrome.storage.local.get('skipRules')) as {
    skipRules: SkipRule[];
  };
  return skipRules;
}

export function describeRule(rule: SkipRule): string {
  const val = typeof rule.value === 'number' ? `${rule.value}s` : `"${rule.value}"`;
  return `if ${rule.attribute} ${rule.operator} ${val} → ${rule.action.replace('-', ' ')}`;
}

export const NUMERIC_OPERATORS: SkipRule['operator'][] = ['>', '<', '>=', '<=', '==', '!='];
export const STRING_OPERATORS: SkipRule['operator'][] = ['==', '!=', 'contains'];

export function getOperatorsForAttribute(attr: SkipRule['attribute']): SkipRule['operator'][] {
  return attr === 'category' ? STRING_OPERATORS : NUMERIC_OPERATORS;
}
