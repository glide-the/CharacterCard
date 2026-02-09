import React from 'react';
import { Phase } from '../types';
import {
  useCurrentStory,
  useDecisionHistory,
  useSetPhase,
  useTurnCount,
  useMaxTurns,
} from '../store';

const romanTurn = (num: number) => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return roman[num - 1] || num;
};

const previewText = (text: string, limit = 80) => {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
};

const renderStatDelta = (delta: number, label: string, color: string) => {
  const icon = delta > 0 ? 'fa-arrow-up' : delta < 0 ? 'fa-arrow-down' : 'fa-minus';
  const value = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-serif ${color}`}>
      <i className={`fa-solid ${icon}`}></i>
      {label} {value}
    </span>
  );
};

const DecisionFlowPage: React.FC = () => {
  const currentStory = useCurrentStory();
  const decisionHistory = useDecisionHistory();
  const setPhase = useSetPhase();
  const turnCount = useTurnCount();
  const maxTurns = useMaxTurns();

  return (
    <div className="min-h-screen w-full bg-[#0f0303] text-paper relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_20%,#000000_100%)] opacity-80"></div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 py-4 border-b border-brown-700 bg-[#1a0505]/80">
          <div>
            <h1 className="font-display text-2xl text-gold">决策流程可视化</h1>
            <p className="text-xs font-serif text-paper/70">ACT {romanTurn(turnCount)} / {romanTurn(maxTurns)}</p>
          </div>
          <button
            onClick={() => setPhase(Phase.GAMEPLAY)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold text-gold bg-black/40 hover:bg-gold/10 transition-colors rounded-full font-display text-sm"
          >
            <i className="fa-solid fa-arrow-left"></i>
            返回游戏
          </button>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 p-6">
          <section className="bg-[#1a0b0b]/60 border border-brown-700 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-gold">已知决策历程</h2>
              <span className="text-xs text-paper/50 font-serif">共 {decisionHistory.length} 幕</span>
            </div>

            {decisionHistory.length === 0 ? (
              <div className="text-center py-16 text-paper/60 font-serif">
                命运尚未书写，踏出第一步后才能看见你的路径。
              </div>
            ) : (
              <div className="space-y-8">
                {decisionHistory.map((record, index) => {
                  const isCurrent = index === decisionHistory.length - 1;
                  return (
                    <div key={record.chosenOptionId} className="relative pl-10">
                      {index !== decisionHistory.length - 1 && (
                        <span className="absolute left-[18px] top-6 bottom-[-24px] w-px bg-gold/30"></span>
                      )}
                      <span className="absolute left-[10px] top-6 w-4 h-4 rounded-full border border-gold bg-[#2c1810]"></span>
                      <div
                        className={`rounded-xl border-2 bg-[#2c1810]/70 p-5 shadow-lg transition-colors ${
                          isCurrent ? 'border-gold animate-pulse' : 'border-gold/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-3 justify-between">
                          <h3 className="font-display text-lg text-gold">ACT {romanTurn(record.turn)}</h3>
                          <span className="text-xs font-serif text-paper/60">{previewText(record.sceneTextPreview)}</span>
                        </div>

                        <div className="mt-3">
                          <p className="text-sm font-serif text-paper/80">场景摘要</p>
                          <p className="text-sm font-serif text-paper/60 italic">{previewText(record.sceneTextPreview)}</p>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-widest text-paper/60 mb-1">你的选择</p>
                          <div className="inline-flex items-center gap-2 px-3 py-1 border border-gold bg-gold/10 rounded-full text-gold text-sm font-display">
                            <i className="fa-solid fa-route"></i>
                            {record.chosenOptionText}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {renderStatDelta(record.statDelta.credibility, '信誉', 'text-green-300')}
                          {renderStatDelta(record.statDelta.stress, '压力', 'text-red-300')}
                          {renderStatDelta(record.statDelta.connections, '人脉', 'text-blue-300')}
                        </div>

                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-widest text-paper/60 mb-1">触发规则</p>
                          {record.triggeredRules.length === 0 ? (
                            <p className="text-xs text-paper/40 font-serif">无</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {record.triggeredRules.map((rule) => (
                                <span
                                  key={rule.ruleId}
                                  className="text-xs px-2 py-1 bg-purple-900/40 border border-purple-500/60 rounded-full text-purple-200"
                                >
                                  {rule.ruleTitle}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs font-serif text-paper/70">
                          <span>信誉：{record.statSnapshot.credibility}</span>
                          <span>压力：{record.statSnapshot.stress}</span>
                          <span>人脉：{record.statSnapshot.connections}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-[#1a0b0b]/60 border border-brown-700 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-gold">未知抉择预览</h2>
              <span className="text-xs font-serif text-paper/50">命运未定</span>
            </div>

            <div className="space-y-4">
              {currentStory?.choices.map((choice) => (
                <div
                  key={choice.id}
                  className="group relative overflow-hidden rounded-xl border border-dashed border-gold/60 bg-black/40 p-4"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.15),_transparent_70%)] opacity-60"></div>
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="text-gold/70 text-lg">
                      <i className="fa-solid fa-question"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-display text-paper/70">迷雾中的分岔</p>
                      <p className="text-xs text-paper/40 font-serif">悬停查看未来细节</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center px-4">
                    <p className="text-sm font-display text-gold mb-1">{choice.text}</p>
                    <p className="text-xs font-serif text-paper/70">{choice.consequence}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-paper/50 font-serif flex items-center gap-2">
              <span className="w-6 h-px bg-gold/40"></span>
              金色虚线象征未发生的命运连接
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DecisionFlowPage;
