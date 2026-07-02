import type { SkipRule } from '../types/storage';
import type { SponsorSegment } from '../types/types';

type SegmentAttributeValue = string | number;
type SegmentAction = SkipRule['action'] | null;

function resolveAttributeValue(
  segment: SponsorSegment,
  attribute: SkipRule['attribute'],
): SegmentAttributeValue {
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

function attributeSatisfiesOperator(
  actualValue: SegmentAttributeValue,
  operator: SkipRule['operator'],
  expectedValue: SkipRule['value'],
): boolean {
  switch (operator) {
    case '==':
      return actualValue === expectedValue;
    case '!=':
      return actualValue !== expectedValue;
    case '>':
      return typeof actualValue === 'number' && actualValue > Number(expectedValue);
    case '<':
      return typeof actualValue === 'number' && actualValue < Number(expectedValue);
    case '>=':
      return typeof actualValue === 'number' && actualValue >= Number(expectedValue);
    case '<=':
      return typeof actualValue === 'number' && actualValue <= Number(expectedValue);
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
  }
}

export function evaluateRules(segment: SponsorSegment, rules: SkipRule[]): SegmentAction {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const actualValue = resolveAttributeValue(segment, rule.attribute);
    if (attributeSatisfiesOperator(actualValue, rule.operator, rule.value)) return rule.action;
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
  const { storage } = await import('../utils/browserApi');
  await storage.local.set({ skipRules: rules });
}

export async function loadRules(): Promise<SkipRule[]> {
  const { storage } = await import('../utils/browserApi');
  const { skipRules = [] } = (await storage.local.get('skipRules')) as {
    skipRules: SkipRule[];
  };
  return skipRules;
}

export function describeRule(rule: SkipRule): string {
  const formattedValue = typeof rule.value === 'number' ? `${rule.value}s` : `"${rule.value}"`;
  return `if ${rule.attribute} ${rule.operator} ${formattedValue} → ${rule.action.replace('-', ' ')}`;
}

export const NUMERIC_OPERATORS: SkipRule['operator'][] = ['>', '<', '>=', '<=', '==', '!='];
export const STRING_OPERATORS: SkipRule['operator'][] = ['==', '!=', 'contains'];

export function getOperatorsForAttribute(attribute: SkipRule['attribute']): SkipRule['operator'][] {
  return attribute === 'category' ? STRING_OPERATORS : NUMERIC_OPERATORS;
}
