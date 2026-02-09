import { ParsedRuleMapping, ParsedRuleLink, RuleCard, StatKey } from '../types';

interface RuleStatMapping {
  statKey: StatKey;
  threshold: number | null;
  direction: 'below' | 'above' | 'none';
  warningMessage: string;
}

const STAT_LABELS: Record<StatKey, string> = {
  credibility: '信誉度',
  stress: '精神压力',
  connections: '人脉'
};

const RULE_STAT_MAPPINGS: Record<string, RuleStatMapping[]> = {
  r2: [
    {
      statKey: 'credibility',
      threshold: 3,
      direction: 'below',
      warningMessage: '低信誉度会使 NPC 产生敌意。'
    },
    {
      statKey: 'stress',
      threshold: 8,
      direction: 'above',
      warningMessage: '高压力会触发幻觉事件。'
    }
  ],
  r3: [
    {
      statKey: 'stress',
      threshold: null,
      direction: 'none',
      warningMessage: '休息可恢复，但会增加腐化。'
    }
  ],
  r6: [
    {
      statKey: 'credibility',
      threshold: null,
      direction: 'none',
      warningMessage: '名声会先于你抵达城镇。'
    }
  ],
  r10: [
    {
      statKey: 'connections',
      threshold: null,
      direction: 'none',
      warningMessage: '停留越久，价格越高。'
    }
  ],
  r11: [
    {
      statKey: 'stress',
      threshold: null,
      direction: 'none',
      warningMessage: '夜间行动需理智检定。'
    }
  ]
};

const buildLinkedStats = (
  mappings: RuleStatMapping[],
  stats: Record<StatKey, number>
): ParsedRuleLink[] =>
  mappings.map((mapping) => {
    const currentValue = stats[mapping.statKey];
    const isTriggered =
      mapping.threshold !== null
        ? mapping.direction === 'below'
          ? currentValue < mapping.threshold
          : currentValue > mapping.threshold
        : false;
    return {
      statKey: mapping.statKey,
      statLabel: STAT_LABELS[mapping.statKey],
      currentValue,
      threshold: mapping.threshold,
      direction: mapping.direction,
      isTriggered,
      warningMessage: mapping.warningMessage
    };
  });

export const parseRuleMappings = (
  rules: RuleCard[],
  stats: Record<StatKey, number>
): ParsedRuleMapping[] =>
  rules.map((rule) => {
    const mappings = RULE_STAT_MAPPINGS[rule.id] ?? [];
    const linkedStats = buildLinkedStats(mappings, stats);
    return {
      rule,
      linkedStats,
      isAnyTriggered: linkedStats.some((stat) => stat.isTriggered)
    };
  });

