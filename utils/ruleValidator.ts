import { RuleCard, StatKey, TriggeredRule } from '../types';

interface RuleValidatorParams {
  activeRules: RuleCard[];
  newStats: Record<StatKey, number>;
  aiTriggeredRules: TriggeredRule[];
}

const dedupeTriggeredRules = (rules: TriggeredRule[]): TriggeredRule[] => {
  const seen = new Map<string, TriggeredRule>();
  rules.forEach((rule) => {
    if (!seen.has(rule.ruleId)) {
      seen.set(rule.ruleId, rule);
    }
  });
  return Array.from(seen.values());
};

export const mergeTriggeredRules = ({
  activeRules,
  newStats,
  aiTriggeredRules
}: RuleValidatorParams): TriggeredRule[] => {
  const merged = [...aiTriggeredRules];
  const triggeredMap = new Map(aiTriggeredRules.map((rule) => [rule.ruleId, rule]));

  const socialRule = activeRules.find((rule) => rule.id === 'r2');
  if (socialRule && !triggeredMap.has('r2')) {
    if (newStats.credibility < 3) {
      merged.push({
        ruleId: 'r2',
        ruleTitle: socialRule.title,
        reason: `当前信誉度已降至 ${newStats.credibility}，低于阈值 3，NPC 将产生敌意。`
      });
    } else if (newStats.stress > 8) {
      merged.push({
        ruleId: 'r2',
        ruleTitle: socialRule.title,
        reason: `当前精神压力已升至 ${newStats.stress}，超过阈值 8，可能触发幻觉事件。`
      });
    }
  }

  return dedupeTriggeredRules(merged);
};

