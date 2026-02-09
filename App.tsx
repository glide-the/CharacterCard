import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Phase, Character, EngineResult, TriggeredRule } from './types';
import { CHARACTERS } from './constants';
import CharacterCard from './components/CharacterCard';
import RuleCardComponent from './components/RuleCard';
import { AiSettingsModal } from './components/AiSettingsModal';
import DecisionFlowPage from './components/DecisionFlowPage';
import TurnCompleteToast from './components/TurnCompleteToast';
import RealityMappingPanel from './components/RealityMappingPanel';
import { processTurn } from './services/geminiService';
import { parseRuleMappings } from './utils/ruleParser';
import { mergeTriggeredRules } from './utils/ruleValidator';
import {
  usePhase,
  useCharacter,
  useRules,
  useStoryLog,
  useCurrentStory,
  useRealityStats,
  useTurnCount,
  useMaxTurns,
  useFinalSummary,
  useLoading,
  useCurrentTriggeredRules,
  useSetPhase,
  useSetCharacter,
  useSetRules,
  useSetStoryLog,
  useSetCurrentStory,
  useSetDecisionHistory,
  useSetRealityStats,
  useSetTurnCount,
  useSetFinalSummary,
  useSetLoading,
  useSetCurrentTriggeredRules,
  useResetGame,
  useStartNewGame,
  useProvider,
  useGeminiKey,
  useOpenaiConfig,
  useSetShowAiSettings,
} from './store';

const App: React.FC = () => {
  // Use zustand store instead of useState
  const phase = usePhase();
  const character = useCharacter();
  const rules = useRules();
  const storyLog = useStoryLog();
  const currentStory = useCurrentStory();
  const realityStats = useRealityStats();
  const turnCount = useTurnCount();
  const maxTurns = useMaxTurns();
  const finalSummary = useFinalSummary();
  const loading = useLoading();
  const currentTriggeredRules = useCurrentTriggeredRules();

  // AI Configuration
  const provider = useProvider();
  const geminiKey = useGeminiKey();
  const openaiConfig = useOpenaiConfig();
  const setShowAiSettings = useSetShowAiSettings();

  // Actions
  const setPhase = useSetPhase();
  const setCharacter = useSetCharacter();
  const setRules = useSetRules();
  const setStoryLog = useSetStoryLog();
  const setCurrentStory = useSetCurrentStory();
  const setDecisionHistory = useSetDecisionHistory();
  const setRealityStats = useSetRealityStats();
  const setTurnCount = useSetTurnCount();
  const setFinalSummary = useSetFinalSummary();
  const setLoading = useSetLoading();
  const setCurrentTriggeredRules = useSetCurrentTriggeredRules();
  const resetGame = useResetGame();
  const startNewGame = useStartNewGame();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTurnToast, setShowTurnToast] = useState(false);
  const [toastTurn, setToastTurn] = useState(0);
  const [autoTooltipToken, setAutoTooltipToken] = useState(0);
  const [hoveredTriggeredRuleId, setHoveredTriggeredRuleId] = useState<string | null>(null);
  const parsedMappings = useMemo(
    () => parseRuleMappings(rules, realityStats),
    [rules, realityStats]
  );
  const parsedMappingMap = useMemo(
    () => new Map(parsedMappings.map((mapping) => [mapping.rule.id, mapping])),
    [parsedMappings]
  );

  // Auto-scroll to bottom of story log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storyLog, currentStory, loading]);

  useEffect(() => {
    if (currentTriggeredRules.length > 0) {
      setAutoTooltipToken((prev) => prev + 1);
    }
  }, [currentTriggeredRules]);

  const handleCharacterSelect = (char: Character) => {
    setCharacter(char);
  };

  const handleStartGame = () => {
    if (!character) return;
    startNewGame(character);
  };

  const handleChoice = async (choiceId: string, choiceText: string) => {
    if (!character || !currentStory) return;
    
    setLoading(true);

    const historySummary = storyLog.map(n => n.text).join(' ').slice(-1000);
    
    // Build AI provider config from store
    const providerConfig = {
      provider,
      gemini: geminiKey ? { apiKey: geminiKey } : undefined,
      openai: provider === 'openai' ? openaiConfig : undefined
    };
    
    // 1. EXECUTE ENGINE with provider config
    const result: EngineResult = await processTurn(
      character,
      rules.filter(r => r.active),
      realityStats,
      choiceText,
      historySummary,
      turnCount,
      maxTurns,
      providerConfig
    );

    setLoading(false);

    // 2. PROCESS STATE UPDATES
    // A. Update Stats
    const previousStats = { ...realityStats };
    const newStats = { ...realityStats };
    if (result.statUpdates.credibility) newStats.credibility += result.statUpdates.credibility;
    if (result.statUpdates.stress) newStats.stress += result.statUpdates.stress;
    if (result.statUpdates.connections) newStats.connections += result.statUpdates.connections;

    // Clamp values
    newStats.credibility = Math.max(0, Math.min(10, newStats.credibility));
    newStats.stress = Math.max(0, Math.min(10, newStats.stress));
    newStats.connections = Math.max(0, Math.min(10, newStats.connections));

    // B. Update Rules
    let newRules = [...rules];
    // Remove rules
    if (result.ruleUpdates.removeIds) {
        newRules = newRules.filter(r => !result.ruleUpdates.removeIds?.includes(r.id));
    }
    // Add rules
    if (result.ruleUpdates.add) {
        newRules = [...newRules, ...result.ruleUpdates.add];
    }

    // C. Check Critical Failures (Client-side guardrails in addition to AI)
    let isGameOver = result.isGameOver;
    let summary = result.gameSummary || "";

    if (newStats.stress >= 10) {
        isGameOver = true;
        summary = summary || "你的理智已经破碎。世界变成了一团无法理解的色彩和尖叫。";
    }
    if (newStats.credibility <= 0) {
        isGameOver = true;
        summary = summary || "你被彻底放逐。没有城市愿意为你打开大门。";
    }

    // D. Update all states
    const completedTurn = turnCount;
    setRealityStats(newStats);
    setRules(newRules);
    setCurrentStory(result.storyNode);
    setStoryLog(prev => [...prev, result.storyNode]);
    setTurnCount(turnCount + 1);
    const mergedTriggeredRules = mergeTriggeredRules({
      activeRules: newRules.filter((rule) => rule.active),
      newStats,
      aiTriggeredRules: result.triggeredRules || []
    });
    setCurrentTriggeredRules(mergedTriggeredRules);
    const scenePreview = currentStory.text.length > 80
      ? `${currentStory.text.slice(0, 80)}…`
      : currentStory.text;

    setDecisionHistory((prev) => [
      ...prev,
      {
        turn: completedTurn,
        sceneTextPreview: scenePreview,
        chosenOptionText: choiceText,
        chosenOptionId: choiceId,
        triggeredRules: mergedTriggeredRules,
        statSnapshot: newStats,
        statDelta: {
          credibility: newStats.credibility - previousStats.credibility,
          stress: newStats.stress - previousStats.stress,
          connections: newStats.connections - previousStats.connections,
        },
      },
    ]);
    
    if (isGameOver) {
      setPhase(Phase.GAME_OVER);
      setFinalSummary(summary);
    } else {
      setToastTurn(completedTurn);
      setShowTurnToast(true);
    }
  };

  const restartGame = () => {
    resetGame();
  };

  // --- Render Functions ---

  const renderSelection = () => (
    <div className="h-screen w-full flex flex-col items-center bg-velvet-red relative overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_20%,#000000_100%)] opacity-80 fixed"></div>
        
        {/* Settings Button */}
        <button
          onClick={() => setShowAiSettings(true)}
          className="fixed top-6 right-6 z-30 p-4 bg-brown-800/80 hover:bg-brown-700 border-2 border-gold/50 hover:border-gold text-gold rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all group"
          title="AI 设置"
        >
          <i className="fa-solid fa-cog text-xl group-hover:rotate-90 transition-transform duration-300"></i>
        </button>
        
        <div className="z-10 text-center mb-6 mt-6 shrink-0 animate-float">
          <h1 className="text-4xl md:text-6xl font-bold text-gold-flow mb-2 drop-shadow-lg font-display">
            人格编年史
          </h1>
          <p className="text-paper text-base font-serif italic opacity-80 max-w-2xl mx-auto border-b border-gold pb-3">
            "选择你的面具。这个世界的规则并非刻在石头上，而是由鲜血和抉择书写。"
          </p>
        </div>

        <div className="z-20 flex flex-col items-center gap-3 mb-4 shrink-0">
            <button 
              disabled={!character}
              onClick={handleStartGame}
              className={`
                px-10 py-3 text-lg font-bold font-display tracking-widest uppercase transition-all duration-500
                border-2 border-gold relative overflow-hidden group shadow-2xl
                ${character 
                  ? 'bg-velvet-red text-gold shadow-[0_0_30px_#D4AF37] hover:scale-110' 
                  : 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-700'}
              `}
            >
              <span className="relative z-10 flex items-center gap-2">
                 {character ? `化身 ${character.name}` : '选择角色'}
                 <i className="fa-solid fa-scroll"></i>
              </span>
              <div className="absolute inset-0 bg-gold transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
            </button>
        </div>

        <div className="z-10 flex-1 overflow-y-auto w-full px-4 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
            {CHARACTERS.map(char => (
              <div key={char.id} className="flex justify-center">
                 <CharacterCard 
                    character={char} 
                    isSelected={character?.id === char.id}
                    onSelect={handleCharacterSelect}
                 />
              </div>
            ))}
          </div>
        </div>
    </div>
  );

  const renderGameOver = () => (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
          
          {/* Settings Button */}
          <button
            onClick={() => setShowAiSettings(true)}
            className="fixed top-6 right-6 z-30 p-4 bg-brown-800/80 hover:bg-brown-700 border-2 border-gold/50 hover:border-gold text-gold rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all group"
            title="AI 设置"
          >
            <i className="fa-solid fa-cog text-xl group-hover:rotate-90 transition-transform duration-300"></i>
          </button>
          
          <div className="z-10 max-w-2xl text-center border-[6px] border-double border-gold p-12 bg-[#1a0f0f] shadow-[0_0_100px_rgba(139,0,0,0.5)] transform animate-fade-in-up">
              <h1 className="text-6xl font-display text-velvet-red mb-6 uppercase tracking-widest">
                  {turnCount >= maxTurns ? "命运终结" : "旅途崩坏"}
              </h1>
              <div className="w-full h-1 bg-gold mb-8"></div>
              
              <div className="mb-8 font-serif text-2xl text-paper italic leading-relaxed">
                  "{finalSummary || "你的故事在这里戛然而止..."}"
              </div>

              <div className="grid grid-cols-3 gap-8 mb-12 opacity-80">
                  <div className="flex flex-col">
                      <span className="text-stone-gray text-xs uppercase tracking-widest">最终信誉</span>
                      <span className="text-gold font-display text-3xl">{realityStats.credibility}</span>
                  </div>
                   <div className="flex flex-col">
                      <span className="text-stone-gray text-xs uppercase tracking-widest">精神残留</span>
                      <span className="text-gold font-display text-3xl">{10 - realityStats.stress}</span>
                  </div>
                   <div className="flex flex-col">
                      <span className="text-stone-gray text-xs uppercase tracking-widest">幸存回合</span>
                      <span className="text-gold font-display text-3xl">{turnCount}</span>
                  </div>
              </div>

              <button 
                  onClick={restartGame}
                  className="px-8 py-3 bg-gold text-black font-bold hover:bg-white transition-colors duration-300 font-display uppercase tracking-widest"
              >
                  轮回重置
              </button>
          </div>
      </div>
  );

  const renderGameplay = () => {
    if (!currentStory) return null;

    // Helper for Roman Numerals for Acts
    const romanTurn = (num: number) => {
        const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
        return roman[num - 1] || num;
    };

    // Build a map of triggered rules for quick lookup
    const triggeredMap = new Map<string, TriggeredRule>();
    currentTriggeredRules.forEach(tr => triggeredMap.set(tr.ruleId, tr));

    return (
      <div className="h-screen w-full bg-[#1a0505] flex flex-col md:flex-row text-paper overflow-hidden relative">
        
        {/* Settings Button */}
        <button
          onClick={() => setShowAiSettings(true)}
          className="fixed top-6 right-6 z-30 p-3 bg-brown-800/80 hover:bg-brown-700 border-2 border-gold/50 hover:border-gold text-gold rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all group"
          title="AI 设置"
        >
          <i className="fa-solid fa-cog text-lg group-hover:rotate-90 transition-transform duration-300"></i>
        </button>
        
        {/* LEFT COLUMN: Character & Stats (25%) */}
        <div className="hidden md:flex flex-col w-1/4 bg-[#0f0303] border-r-4 border-brown-600 relative shadow-2xl z-10 h-screen overflow-y-auto scrollbar-hide">
          <div className="p-6">
            <h2 className="text-gold font-display text-xl mb-4 border-b border-brown pb-2 text-center">当前角色</h2>
            {character && (
               <div className="flex justify-center transform scale-[0.6] origin-top mb-[-120px]">
                 <CharacterCard character={character} isSelected={true} />
               </div>
            )}
            
            <div className="mt-20">
                <h2 className="text-gold font-display text-lg mb-3 border-b border-brown pb-2 flex items-center gap-2">
                  <i className="fa-solid fa-map text-sm"></i>现实映射
                </h2>
                <RealityMappingPanel
                  rules={rules}
                  realityStats={realityStats}
                  parsedMappings={parsedMappings}
                  triggeredMap={triggeredMap}
                />
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Narrative (50%) */}
        <div className="flex-1 flex flex-col relative h-screen bg-paper/5">
          {/* Header Bar */}
          <div className="shrink-0 h-12 bg-gradient-to-b from-black to-transparent z-20 flex items-center justify-center relative">
             <span className="text-gold opacity-50 font-display tracking-[0.5em] text-sm">
                ACT {romanTurn(turnCount)} / {romanTurn(maxTurns)}
             </span>
             <button
               onClick={() => setPhase(Phase.DECISION_MAP)}
               className="absolute right-4 top-1/2 -translate-y-1/2 p-2 border border-gold/60 text-gold rounded-full hover:bg-gold/10 transition-colors"
               title="查看决策流程"
             >
               <i className="fa-solid fa-route text-sm"></i>
             </button>
          </div>

          <div className="mx-4 md:hidden mt-3">
            <RealityMappingPanel
              rules={rules}
              realityStats={realityStats}
              parsedMappings={parsedMappings}
              triggeredMap={triggeredMap}
              isMobile
            />
          </div>

          {/* Triggered Rules Banner */}
          {currentTriggeredRules.length > 0 && !loading && (
            <div className="shrink-0 mx-4 md:mx-8 mb-2 p-2 bg-yellow-900/20 border border-yellow-600/40 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">
                  <i className="fa-solid fa-bolt text-[10px]"></i>本轮触发:
                </span>
                {currentTriggeredRules.map((tr, i) => (
                  <span
                    key={i}
                    className="group relative inline-flex items-center text-xs bg-yellow-800/40 text-yellow-200 px-2 py-0.5 rounded border border-yellow-600/30 cursor-help"
                    onMouseEnter={() => setHoveredTriggeredRuleId(tr.ruleId)}
                    onMouseLeave={() => setHoveredTriggeredRuleId(null)}
                  >
                    {tr.ruleTitle}
                    {/* Inline hover tooltip */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#1a0505] border border-yellow-500/50 rounded text-[10px] text-paper leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-150 z-50 shadow-xl">
                      <span className="text-yellow-400 font-bold block mb-0.5">触发原因:</span>
                      {tr.reason}
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a0505] border-r border-b border-yellow-500/50 transform rotate-45"></span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-12 py-4 scrollbar-hide scroll-smooth">
             {/* Story Log */}
             {storyLog.slice(0, -1).map((node, idx) => (
                <div key={idx} className="mb-8 opacity-50 text-sm font-serif border-l-4 border-brown-600 pl-4 italic hover:opacity-100 transition-opacity">
                    <p>{node.text}</p>
                </div>
             ))}

             {/* Current Node */}
             <div className="animate-fade-in-up pb-8">
                <div className="flex items-center justify-center mb-6 text-gold opacity-80">
                   <div className="h-[1px] w-12 bg-gold"></div>
                   <i className="fa-solid fa-diamond text-sm mx-4 animate-spin-slow"></i>
                   <span className="uppercase tracking-[0.3em] text-sm font-display">
                       {turnCount === 1 ? "序幕" : "当前场景"}
                   </span>
                   <i className="fa-solid fa-diamond text-sm mx-4 animate-spin-slow"></i>
                   <div className="h-[1px] w-12 bg-gold"></div>
                </div>
                
                <p className="font-serif text-xl md:text-2xl leading-relaxed mb-8 drop-shadow-md text-justify text-paper first-letter:text-5xl first-letter:font-display first-letter:text-gold first-letter:mr-2 first-letter:float-left">
                  {currentStory.text}
                </p>

                {loading ? (
                   <div className="flex flex-col justify-center items-center py-8 gap-3">
                      <div className="relative">
                          <i className="fa-solid fa-sun fa-spin text-5xl text-gold opacity-20"></i>
                          <i className="fa-solid fa-eye absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl text-gold animate-pulse"></i>
                      </div>
                      <span className="font-serif italic text-lg text-stone-gray animate-pulse">规则引擎正在演算后果...</span>
                      <div className="text-xs text-brown font-mono mt-1">
                          Checking: {rules.filter(r => r.active).map(r => r.title).slice(0, 3).join(", ")}...
                      </div>
                   </div>
                ) : (
                  <div className="grid gap-4 max-w-3xl mx-auto">
                    {currentStory.choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() => handleChoice(choice.id, choice.text)}
                        className="group relative p-5 bg-[#2c1810] border-2 border-brown text-left hover:bg-[#3d2216] hover:border-gold transition-all duration-300 rounded-xl overflow-hidden shadow-lg"
                      >
                         <div className="absolute inset-0 bg-gold opacity-0 group-hover:opacity-5 transition-opacity"></div>
                         <div className="absolute left-0 top-0 bottom-0 w-2 bg-gold transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
                         
                         <div className="flex items-start gap-3">
                             <div className="mt-1 text-gold opacity-50 group-hover:opacity-100"><i className="fa-solid fa-chevron-right"></i></div>
                             <div>
                                <h4 className="font-bold text-lg mb-1.5 group-hover:text-gold transition-colors font-display">{choice.text}</h4>
                                <div className="flex flex-wrap gap-3 text-sm opacity-70 font-serif">
                                    {choice.cost && <span className="text-red-400 flex items-center gap-1"><i className="fa-solid fa-coins"></i> {choice.cost}</span>}
                                    {choice.risk && <span className="text-orange-400 flex items-center gap-1"><i className="fa-solid fa-triangle-exclamation"></i> {choice.risk}</span>}
                                    <span className="text-stone-gray italic border-l border-stone-gray pl-3">{choice.consequence}</span>
                                </div>
                             </div>
                         </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Rules Deck (25%) */}
        <div className="hidden md:flex flex-col w-1/4 bg-[#140404] border-l-4 border-brown-600 p-4 shadow-2xl z-10 h-screen">
            <h2 className="text-gold font-display text-lg mb-4 border-b border-brown pb-2 flex justify-between items-center shrink-0">
              <span>世界法则</span>
              <div className="flex items-center gap-2">
                {currentTriggeredRules.length > 0 && (
                  <span className="text-[10px] bg-yellow-600 px-1.5 py-0.5 rounded text-black font-bold border border-yellow-400">
                    <i className="fa-solid fa-bolt mr-0.5"></i>{currentTriggeredRules.length} 触发
                  </span>
                )}
                <span className="text-xs bg-velvet-red px-2 py-0.5 rounded text-gold border border-gold">{rules.filter(r => r.active).length} 激活</span>
              </div>
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-3">
               {rules
                 .filter((rule) => rule.active)
                 .sort((a, b) => {
                   const aTriggered = triggeredMap.has(a.id) ? 1 : 0;
                   const bTriggered = triggeredMap.has(b.id) ? 1 : 0;
                   return bTriggered - aTriggered;
                 })
                 .map((rule) => (
                  <RuleCardComponent 
                    key={rule.id} 
                    rule={rule} 
                    triggeredInfo={triggeredMap.get(rule.id)}
                    parsedMapping={parsedMappingMap.get(rule.id)}
                    autoShowToken={autoTooltipToken}
                    isHighlighted={hoveredTriggeredRuleId === rule.id}
                  />
               ))}
               
               {rules.some(r => !r.active) && (
                   <div className="text-center p-3 border border-dashed border-brown-600 opacity-50 rounded-lg">
                       <p className="text-xs text-stone-gray">隐藏的规则在黑暗中沉睡...</p>
                   </div>
               )}
            </div>

            <div className="mt-4 p-3 bg-brown-800/20 rounded border border-brown text-center shrink-0">
                <i className="fa-solid fa-gear text-xl text-brown mb-1 animate-spin-slow opacity-50"></i>
                <p className="text-[10px] text-stone-gray italic">"系统正在监听每一个抉择。"</p>
                <button 
                  onClick={resetGame}
                  className="mt-2 text-xs text-paper/60 hover:text-gold transition-colors duration-300 underline underline-offset-2 decoration-dotted"
                >
                  <i className="fa-solid fa-rotate-right mr-1"></i>
                  清除数据重新开始
                </button>
            </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {phase === Phase.SELECTION && renderSelection()}
      {phase === Phase.GAMEPLAY && renderGameplay()}
      {phase === Phase.DECISION_MAP && <DecisionFlowPage />}
      {phase === Phase.GAME_OVER && renderGameOver()}
      <TurnCompleteToast
        isOpen={showTurnToast}
        turnNumber={toastTurn}
        onViewDecision={() => setPhase(Phase.DECISION_MAP)}
        onDismiss={() => setShowTurnToast(false)}
      />
      <AiSettingsModal />
    </>
  );
};

export default App;
