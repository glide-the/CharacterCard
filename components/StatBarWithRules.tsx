import React from 'react';
import { ParsedRuleLink, RuleCard, TriggeredRule } from '../types';

interface LinkedRuleDisplay {
  rule: RuleCard;
  link: ParsedRuleLink;
  isActive: boolean;
  triggeredInfo?: TriggeredRule;
}

interface Props {
  label: string;
  icon: string;
  value: number;
  max?: number;
  barColor: string;
  linkedRules: LinkedRuleDisplay[];
}

const StatBarWithRules: React.FC<Props> = ({
  label,
  icon,
  value,
  max = 10,
  barColor,
  linkedRules
}) => {
  const hasTriggered = linkedRules.some(
    (linked) => linked.link.isTriggered && linked.isActive
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-stone-gray">
        <span>
          <i className={`fa-solid ${icon} mr-1.5`}></i>
          {label}
        </span>
        <span className={hasTriggered ? 'text-red-400 animate-pulse' : ''}>
          {value}/{max}
        </span>
      </div>
      <div className="w-full bg-[#2c1810] h-2.5 rounded-full overflow-hidden border border-brown-600 relative">
        <div
          className={`${barColor} h-full transition-all duration-1000`}
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
        {linkedRules
          .filter((linked) => linked.link.threshold !== null)
          .map((linked) => (
            <div
              key={`${linked.rule.id}-${linked.link.threshold}`}
              className="absolute top-0 bottom-0 w-0.5 bg-red-500/60"
              style={{ left: `${(linked.link.threshold! / max) * 100}%` }}
              title={`阈值: ${linked.link.threshold}`}
            ></div>
          ))}
      </div>

      <div className="space-y-1">
        {linkedRules.length === 0 && (
          <div className="text-[10px] text-stone-gray italic">暂无关联规则</div>
        )}
        {linkedRules.map((linked) => {
          const { link, rule, isActive, triggeredInfo } = linked;
          const isTriggered = link.isTriggered && isActive;
          const distance =
            link.threshold === null
              ? null
              : Math.abs(link.currentValue - link.threshold);
          const isWarning =
            isActive && link.threshold !== null && !isTriggered && distance !== null && distance <= 2;
          const statusClass = !isActive
            ? 'text-stone-gray bg-brown-800/30 border-brown-700/60'
            : isTriggered
            ? 'text-red-300 bg-red-900/30 border-red-700/60 animate-pulse'
            : isWarning
            ? 'text-yellow-300 bg-yellow-900/20 border-yellow-700/60'
            : link.threshold === null
            ? 'text-purple-200 bg-purple-900/20 border-purple-700/40'
            : 'text-green-300 bg-green-900/20 border-green-700/50';

          const statusText = !isActive
            ? '未激活'
            : isTriggered
            ? `🔴 生效${triggeredInfo ? `：${triggeredInfo.reason}` : ''}`
            : isWarning
            ? `⚠ 注意（距阈值差 ${distance}）`
            : link.threshold === null
            ? '📌 叙事提示'
            : '✅ 安全';

          return (
            <div
              key={`${rule.id}-${link.statKey}-${link.warningMessage}`}
              className={`flex items-start justify-between gap-2 rounded border px-2 py-1 text-[10px] ${statusClass}`}
            >
              <div>
                <span className="font-semibold">{rule.title}</span>
                <span className="ml-1 text-[9px] opacity-80">({rule.type})</span>
                <p className="text-[10px] opacity-80">{link.warningMessage}</p>
              </div>
              <span className="text-right min-w-[90px]">{statusText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatBarWithRules;

