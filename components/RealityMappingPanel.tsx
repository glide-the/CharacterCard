import React, { useMemo, useState } from 'react';
import { ParsedRuleMapping, RuleCard, StatKey, TriggeredRule } from '../types';
import StatBarWithRules from './StatBarWithRules';

interface Props {
  aiAnalysis?: Array<{
    statKey: StatKey;
    status: 'safe' | 'warning' | 'triggered';
    warningMessage: string;
    reason: string;
  }> | null;
  loading?: boolean;
  rules: RuleCard[];
  realityStats: Record<StatKey, number>;
  parsedMappings: ParsedRuleMapping[];
  triggeredMap: Map<string, TriggeredRule>;
  className?: string;
  isMobile?: boolean;
}

const STAT_CONFIG = [
  {
    key: 'credibility' as StatKey,
    label: '信誉度',
    icon: 'fa-scale-balanced',
    barColor: 'bg-forest-green'
  },
  {
    key: 'stress' as StatKey,
    label: '精神压力',
    icon: 'fa-brain',
    barColor: 'bg-orange-700'
  },
  {
    key: 'connections' as StatKey,
    label: '人脉',
    icon: 'fa-handshake',
    barColor: 'bg-blue-700'
  }
];

const RealityMappingPanel: React.FC<Props> = ({
  rules,
  realityStats,
  parsedMappings,
  triggeredMap,
  className,
  isMobile = false,
  aiAnalysis = null,
  loading = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const statGroups = useMemo(
    () =>
      STAT_CONFIG.map((stat) => {
        const linkedRules = parsedMappings.flatMap((mapping) =>
          mapping.linkedStats
            .filter((link) => link.statKey === stat.key)
            .map((link) => ({
              rule: mapping.rule,
              link,
              isActive: mapping.rule.active,
              triggeredInfo: triggeredMap.get(mapping.rule.id)
            }))
        );
        return { ...stat, linkedRules };
      }),
    [parsedMappings, triggeredMap]
  );


  const analysisMap = useMemo(() => {
    const m = new Map<StatKey, { status: 'safe' | 'warning' | 'triggered'; warningMessage: string; reason: string }>();
    (aiAnalysis || []).forEach((item) => m.set(item.statKey, { status: item.status, warningMessage: item.warningMessage, reason: item.reason }));
    return m;
  }, [aiAnalysis]);

  const unlinkedActiveRules = useMemo(() => {
    const mappedRuleIds = new Set(
      parsedMappings.filter((mapping) => mapping.linkedStats.length > 0).map((mapping) => mapping.rule.id)
    );
    return rules.filter((rule) => rule.active && !mappedRuleIds.has(rule.id));
  }, [parsedMappings, rules]);

  const miniBars = (
    <div className="grid grid-cols-3 gap-2">
      {statGroups.map((stat) => {
        const aiStatus = analysisMap.get(stat.key)?.status;
        const hasTriggered = aiStatus === 'triggered' || stat.linkedRules.some(
          (linked) => linked.isActive && linked.link.isTriggered
        );
        return (
          <div key={stat.key} className="rounded border border-brown-700/60 p-2 bg-brown-900/30">
            <div className="flex items-center justify-between text-[10px] text-stone-gray">
              <span>{stat.label}</span>
              {hasTriggered && <i className="fa-solid fa-triangle-exclamation text-red-400"></i>}
            </div>
            <div className="mt-1 w-full bg-[#2c1810] h-1.5 rounded-full overflow-hidden">
              <div
                className={`${stat.barColor} h-full`}
                style={{ width: `${(realityStats[stat.key] / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const content = (
    <div className="space-y-4">
      <div className="space-y-4 bg-brown-800/30 p-3 rounded-lg border border-brown">
        {loading && <div className="text-xs text-stone-gray">现实映射分析中...</div>}
        {!loading && aiAnalysis && aiAnalysis.length > 0 && (
          <div className="space-y-1 text-xs">
            {aiAnalysis.map((item) => (
              <div key={item.statKey} className="text-paper/80">
                <span className="text-gold mr-1">{item.statKey}</span>
                <span>{item.warningMessage || item.reason}</span>
              </div>
            ))}
          </div>
        )}
        {statGroups.map((stat) => (
          <StatBarWithRules
            key={stat.key}
            label={stat.label}
            icon={stat.icon}
            value={realityStats[stat.key]}
            barColor={stat.barColor}
            linkedRules={stat.linkedRules}
          />
        ))}
      </div>

      <div>
        <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-bolt text-[10px]"></i>
          其他活跃规则（非属性映射）
        </h3>
        {unlinkedActiveRules.length === 0 ? (
          <p className="text-[10px] text-stone-gray italic">暂无额外规则。</p>
        ) : (
          <div className="space-y-2">
            {unlinkedActiveRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded border border-brown-700/60 bg-[#1a0a0a] p-2 text-[11px]"
              >
                <div className="flex items-center gap-1 text-gold">
                  <span className="font-semibold">{rule.title}</span>
                  <span className="text-[9px] text-stone-gray">({rule.type})</span>
                </div>
                <p className="text-stone-gray mt-1">{rule.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className={`md:hidden rounded-xl border border-brown-700/60 bg-[#0f0303] p-3 ${className ?? ''}`}>
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="w-full flex items-center justify-between text-gold font-display text-sm mb-3"
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-map text-[10px]"></i>现实映射
          </span>
          <span className="text-xs text-stone-gray">
            {isCollapsed ? '展开' : '收起'}
            <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'} ml-2`}></i>
          </span>
        </button>
        {isCollapsed ? miniBars : content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
};

export default RealityMappingPanel;

