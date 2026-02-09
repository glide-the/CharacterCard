import React, { useEffect, useMemo, useState } from 'react';
import { ParsedRuleMapping, RuleCard as RuleCardType, RuleTooltipMode, TriggeredRule } from '../types';

interface Props {
  rule: RuleCardType;
  triggeredInfo?: TriggeredRule; // 本轮是否被触发及原因
  parsedMapping?: ParsedRuleMapping;
  autoShowToken?: number;
  isHighlighted?: boolean;
}

const RuleCard: React.FC<Props> = ({
  rule,
  triggeredInfo,
  parsedMapping,
  autoShowToken = 0,
  isHighlighted = false
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isAutoShowing, setIsAutoShowing] = useState(false);
  const isTriggered = !!triggeredInfo;

  useEffect(() => {
    if (autoShowToken > 0 && isTriggered) {
      setIsAutoShowing(true);
      const timer = setTimeout(() => setIsAutoShowing(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoShowToken, isTriggered]);

  const showTooltip = isHovering || isAutoShowing;

  const getBorderColor = () => {
    if (isTriggered) return 'border-yellow-400';
    switch (rule.type) {
      case 'CONSTRAINT': return 'border-red-800';
      case 'BONUS': return 'border-green-700';
      case 'RISK': return 'border-orange-600';
      case 'REALITY': return 'border-purple-800';
      default: return 'border-gray-800';
    }
  };

  const typeLabel = () => {
    switch (rule.type) {
      case 'CONSTRAINT': return '约束法则';
      case 'BONUS': return '增益法则';
      case 'RISK': return '风险法则';
      case 'REALITY': return '现实法则';
      default: return '规则';
    }
  };

  const getIcon = () => {
    switch (rule.type) {
      case 'CONSTRAINT': return 'fa-lock';
      case 'BONUS': return 'fa-gift';
      case 'RISK': return 'fa-dice-d20';
      case 'REALITY': return 'fa-scale-balanced';
    }
  };

  const tooltipMode: RuleTooltipMode = !rule.active
    ? 'inactive'
    : isTriggered
    ? 'triggered'
    : 'active';

  const linkedStats = useMemo(() => parsedMapping?.linkedStats ?? [], [parsedMapping]);

  const statusBadge = () => {
    switch (tooltipMode) {
      case 'triggered':
        return <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded">已触发</span>;
      case 'active':
        return <span className="text-[10px] bg-green-700 text-white px-1.5 py-0.5 rounded">激活</span>;
      case 'inactive':
        return <span className="text-[10px] bg-stone-gray/40 text-stone-gray px-1.5 py-0.5 rounded">休眠</span>;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`
        relative w-full mb-3 bg-[#F5DEB3] rounded-lg p-3 border-l-4 shadow-md 
        transform hover:-translate-y-1 transition-all duration-300
        ${getBorderColor()}
        ${isTriggered ? 'ring-2 ring-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.3)] animate-pulse-once' : ''}
        ${isHighlighted ? 'ring-2 ring-yellow-300 animate-pulse' : ''}
      `}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-[#4a0404] text-sm uppercase tracking-wider flex items-center gap-1.5">
          {rule.title}
          {isTriggered && (
            <span className="inline-flex items-center text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-bold normal-case tracking-normal">
              <i className="fa-solid fa-bolt mr-0.5 text-[8px]"></i>已触发
            </span>
          )}
        </h4>
        <i className={`fa-solid ${getIcon()} text-[#8B4513] opacity-50`}></i>
      </div>
      <p className="text-xs text-[#5c4033] leading-snug">{rule.description}</p>
      {rule.type === 'REALITY' && !isTriggered && (
         <div className="absolute -right-1 -top-1 w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
      )}
      
      {/* Hover Tooltip - 规则详情 */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-64 z-50">
          <div className="bg-[#1a0505] border border-yellow-500/60 rounded-lg p-3 shadow-2xl text-left text-paper text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-yellow-400 uppercase tracking-wider text-[10px]">
                <i className={`fa-solid ${getIcon()} text-[10px]`}></i>
                {typeLabel()}
              </span>
              {statusBadge()}
            </div>

            {linkedStats.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] text-stone-gray uppercase tracking-wider mb-1">关联属性</div>
                <div className="space-y-1">
                  {linkedStats.map((link) => {
                    const distance =
                      link.threshold === null ? null : Math.abs(link.currentValue - link.threshold);
                    const marginLabel =
                      link.threshold === null
                        ? '叙事提示'
                        : link.isTriggered
                        ? '已触发'
                        : `安全余量: ${distance}`;
                    return (
                      <div key={`${rule.id}-${link.statKey}`} className="flex justify-between text-[11px]">
                        <span>{link.statLabel}</span>
                        <span className="text-stone-gray">
                          {link.currentValue}/10 {link.threshold !== null ? `(阈值 ${link.threshold})` : ''}
                        </span>
                        <span className="text-yellow-300">{marginLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-brown-700/60 pt-2 mt-2">
              {tooltipMode === 'triggered' && triggeredInfo ? (
                <div>
                  <div className="text-yellow-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                    本轮触发原因
                  </div>
                  <p className="text-paper text-xs leading-relaxed">{triggeredInfo.reason}</p>
                </div>
              ) : tooltipMode === 'active' ? (
                <div className="text-stone-gray">
                  本轮未触发。{linkedStats.length === 0 ? '等待叙事条件满足。' : '保持当前数值即可。'}
                </div>
              ) : (
                <div className="text-stone-gray">
                  此规则当前休眠，可能在特定条件下被激活。
                </div>
              )}
            </div>

            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-[#1a0505] border-r border-b border-yellow-500/60 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleCard;
