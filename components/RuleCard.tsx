import React, { useState } from 'react';
import { RuleCard as RuleCardType, TriggeredRule } from '../types';

interface Props {
  rule: RuleCardType;
  triggeredInfo?: TriggeredRule; // 本轮是否被触发及原因
}

const RuleCard: React.FC<Props> = ({ rule, triggeredInfo }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const isTriggered = !!triggeredInfo;

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

  const getIcon = () => {
    switch (rule.type) {
      case 'CONSTRAINT': return 'fa-lock';
      case 'BONUS': return 'fa-gift';
      case 'RISK': return 'fa-dice-d20';
      case 'REALITY': return 'fa-scale-balanced';
    }
  };

  return (
    <div 
      className={`
        relative w-full mb-3 bg-[#F5DEB3] rounded-lg p-3 border-l-4 shadow-md 
        transform hover:-translate-y-1 transition-all duration-300
        ${getBorderColor()}
        ${isTriggered ? 'ring-2 ring-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.3)] animate-pulse-once' : ''}
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
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
      
      {/* Hover Tooltip - 触发原因 */}
      {isTriggered && showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-full z-50 pointer-events-none">
          <div className="bg-[#1a0505] border border-yellow-500/60 rounded-lg p-3 shadow-2xl text-left">
            <div className="flex items-center gap-1.5 mb-1.5">
              <i className="fa-solid fa-bolt text-yellow-400 text-xs"></i>
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">触发原因</span>
            </div>
            <p className="text-paper text-xs leading-relaxed">{triggeredInfo.reason}</p>
            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-[#1a0505] border-r border-b border-yellow-500/60 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleCard;
