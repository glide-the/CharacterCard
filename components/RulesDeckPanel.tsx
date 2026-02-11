import React from 'react';
import { ParsedRuleMapping, RuleCard, TriggeredRule } from '../types';
import RuleCardComponent from './RuleCard';

interface RulesDeckPanelProps {
  rules: RuleCard[];
  currentTriggeredRules: TriggeredRule[];
  triggeredMap: Map<string, TriggeredRule>;
  parsedMappingMap: Map<string, ParsedRuleMapping>;
  autoTooltipToken: number;
  hoveredTriggeredRuleId: string | null;
  ruleStatusMap: Record<string, 'triggered' | 'active_not_triggered' | 'inactive'>;
  onResetGame: () => void;
  className?: string;
  contentClassName?: string;
}

const RulesDeckPanel: React.FC<RulesDeckPanelProps> = ({
  rules,
  currentTriggeredRules,
  triggeredMap,
  parsedMappingMap,
  autoTooltipToken,
  hoveredTriggeredRuleId,
  ruleStatusMap,
  onResetGame,
  className,
  contentClassName,
}) => {
  const sortedRules = [...rules].sort((a, b) => {
    const getRank = (rule: RuleCard) => {
      const status = ruleStatusMap[rule.id];
      if (status === 'triggered' || triggeredMap.has(rule.id)) return 3;
      if (status === 'active_not_triggered' || rule.active) return 2;
      return 1;
    };

    return getRank(b) - getRank(a);
  });

  return (
    <div className={`flex flex-col bg-[#140404] border-l-4 border-brown-600 p-4 shadow-2xl z-10 ${className ?? ''}`}>
      <h2 className="text-gold font-display text-lg mb-4 border-b border-brown pb-2 flex justify-between items-center shrink-0">
        <span>世界法则</span>
        <div className="flex items-center gap-2">
          {currentTriggeredRules.length > 0 && (
            <span className="text-[10px] bg-yellow-600 px-1.5 py-0.5 rounded text-black font-bold border border-yellow-400">
              <i className="fa-solid fa-bolt mr-0.5"></i>
              {currentTriggeredRules.length} 触发
            </span>
          )}
          <span className="text-xs bg-velvet-red px-2 py-0.5 rounded text-gold border border-gold">
            {rules.filter((rule) => rule.active).length} 激活
          </span>
        </div>
      </h2>

      <div className={`flex-1 pr-1 scrollbar-hide space-y-3 overflow-y-auto ${contentClassName ?? ''}`}>
        {sortedRules.map((rule) => (
          <RuleCardComponent
            key={rule.id}
            rule={rule}
            triggeredInfo={triggeredMap.get(rule.id)}
            parsedMapping={parsedMappingMap.get(rule.id)}
            autoShowToken={autoTooltipToken}
            isHighlighted={hoveredTriggeredRuleId === rule.id}
            statusOverride={ruleStatusMap[rule.id]}
          />
        ))}

        {rules.some((rule) => !rule.active) && (
          <div className="text-center p-3 border border-dashed border-brown-600 opacity-50 rounded-lg">
            <p className="text-xs text-stone-gray">隐藏的规则在黑暗中沉睡...</p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-brown-800/20 rounded border border-brown text-center shrink-0">
        <i className="fa-solid fa-gear text-xl text-brown mb-1 animate-spin-slow opacity-50"></i>
        <p className="text-[10px] text-stone-gray italic">"系统正在监听每一个抉择。"</p>
        <button
          onClick={onResetGame}
          className="mt-2 text-xs text-paper/60 hover:text-gold transition-colors duration-300 underline underline-offset-2 decoration-dotted"
        >
          <i className="fa-solid fa-rotate-right mr-1"></i>
          清除数据重新开始
        </button>
      </div>
    </div>
  );
};

export default RulesDeckPanel;
