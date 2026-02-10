import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  GameState,
  Phase,
  Character,
  RuleCard,
  StoryNode,
  ServiceProvider,
  OpenAIConfig,
  TriggeredRule,
  DecisionRecord,
  RealityMappingTaskOutput,
  TaskAIConfig,
  TaskName,
  TurnAIConfig,
} from "../types";
import { DEFAULT_TASK_CONFIGS, INITIAL_RULES, INTRO_STORY } from "../constants";

const localStorageStorage = createJSONStorage(() => localStorage);

export interface GameStoreState extends GameState {
  loading: boolean;
  currentTriggeredRules: TriggeredRule[];
  narrativeLoading: boolean;
  narrativeStreamBuffer: string;
  realityAnalysisLoading: boolean;
  realityAnalysis: RealityMappingTaskOutput['statAnalysis'] | null;
  worldRulesLoading: boolean;
  ruleStatusMap: Record<string, 'triggered' | 'active_not_triggered' | 'inactive'>;
  choicesLoading: boolean;
  showAiSettings: boolean;
  provider: ServiceProvider;
  geminiKey: string;
  openaiConfig: OpenAIConfig;
  taskConfigs: TurnAIConfig['tasks'];
}

export interface GameStoreActions {
  setPhase: (phase: Phase) => void;
  setCharacter: (character: Character | null) => void;
  setRules: (rules: RuleCard[] | ((prev: RuleCard[]) => RuleCard[])) => void;
  setStoryLog: (storyLog: StoryNode[] | ((prev: StoryNode[]) => StoryNode[])) => void;
  setCurrentStory: (story: StoryNode | null) => void;
  setDecisionHistory: (history: DecisionRecord[] | ((prev: DecisionRecord[]) => DecisionRecord[])) => void;
  setRealityStats: (stats: GameState['realityStats'] | ((prev: GameState['realityStats']) => GameState['realityStats'])) => void;
  setTurnCount: (count: number) => void;
  setMaxTurns: (count: number) => void;
  setFinalSummary: (summary: string | undefined) => void;
  setLoading: (loading: boolean) => void;
  setCurrentTriggeredRules: (rules: TriggeredRule[]) => void;
  setNarrativeLoading: (loading: boolean) => void;
  setNarrativeStreamBuffer: (text: string) => void;
  setRealityAnalysisLoading: (loading: boolean) => void;
  setRealityAnalysis: (analysis: RealityMappingTaskOutput['statAnalysis'] | null) => void;
  setWorldRulesLoading: (loading: boolean) => void;
  setRuleStatusMap: (statusMap: Record<string, 'triggered' | 'active_not_triggered' | 'inactive'>) => void;
  setChoicesLoading: (loading: boolean) => void;
  updateGameState: (updater: (prev: GameState) => Partial<GameState>) => void;
  resetGame: () => void;
  startNewGame: (character: Character) => void;
  setShowAiSettings: (show: boolean) => void;
  setProvider: (provider: ServiceProvider) => void;
  setGeminiKey: (key: string) => void;
  setOpenaiConfig: (config: OpenAIConfig | ((prev: OpenAIConfig) => OpenAIConfig)) => void;
  setTaskConfigs: (configs: TurnAIConfig['tasks']) => void;
  updateTaskConfig: (taskName: TaskName, patch: Partial<TaskAIConfig>) => void;
  resetTaskConfigs: () => void;
}

const initialState: GameStoreState = {
  phase: Phase.SELECTION,
  character: null,
  rules: INITIAL_RULES,
  storyLog: [],
  currentStory: null,
  decisionHistory: [],
  realityStats: { credibility: 5, stress: 2, connections: 3 },
  turnCount: 0,
  maxTurns: 10,
  finalSummary: undefined,
  loading: false,
  currentTriggeredRules: [],
  narrativeLoading: false,
  narrativeStreamBuffer: '',
  realityAnalysisLoading: false,
  realityAnalysis: null,
  worldRulesLoading: false,
  ruleStatusMap: {},
  choicesLoading: false,
  showAiSettings: false,
  provider: 'gemini',
  geminiKey: '',
  openaiConfig: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo-preview'
  },
  taskConfigs: DEFAULT_TASK_CONFIGS,
};

export const gameStore = create<GameStoreState & GameStoreActions>()(
  persist(
    (set) => ({
      ...initialState,
      setPhase: (phase) => set({ phase }),
      setCharacter: (character) => set({ character }),
      setRules: (rules) => set((state) => ({ rules: typeof rules === 'function' ? rules(state.rules) : rules })),
      setStoryLog: (storyLog) => set((state) => ({ storyLog: typeof storyLog === 'function' ? storyLog(state.storyLog) : storyLog })),
      setCurrentStory: (story) => set({ currentStory: story }),
      setDecisionHistory: (history) => set((state) => ({ decisionHistory: typeof history === 'function' ? history(state.decisionHistory) : history })),
      setRealityStats: (stats) => set((state) => ({ realityStats: typeof stats === 'function' ? stats(state.realityStats) : stats })),
      setTurnCount: (count) => set({ turnCount: count }),
      setMaxTurns: (count) => set({ maxTurns: count }),
      setFinalSummary: (summary) => set({ finalSummary: summary }),
      setLoading: (loading) => set({ loading }),
      setCurrentTriggeredRules: (rules) => set({ currentTriggeredRules: rules }),
      setNarrativeLoading: (loading) => set({ narrativeLoading: loading }),
      setNarrativeStreamBuffer: (text) => set({ narrativeStreamBuffer: text }),
      setRealityAnalysisLoading: (loading) => set({ realityAnalysisLoading: loading }),
      setRealityAnalysis: (analysis) => set({ realityAnalysis: analysis }),
      setWorldRulesLoading: (loading) => set({ worldRulesLoading: loading }),
      setRuleStatusMap: (statusMap) => set({ ruleStatusMap: statusMap }),
      setChoicesLoading: (loading) => set({ choicesLoading: loading }),
      updateGameState: (updater) => set((state) => updater(state as GameState)),
      resetGame: () => set({ ...initialState, taskConfigs: DEFAULT_TASK_CONFIGS, showAiSettings: false }),
      startNewGame: (character) => set({
        phase: Phase.GAMEPLAY,
        character,
        currentStory: INTRO_STORY,
        storyLog: [INTRO_STORY],
        decisionHistory: [],
        turnCount: 1,
        realityStats: { credibility: 5, stress: 2, connections: 3 },
        rules: INITIAL_RULES,
        finalSummary: undefined,
        loading: false,
        currentTriggeredRules: [],
        narrativeLoading: false,
        narrativeStreamBuffer: '',
        realityAnalysisLoading: false,
        realityAnalysis: null,
        worldRulesLoading: false,
        ruleStatusMap: {},
        choicesLoading: false,
      }),
      setShowAiSettings: (show) => set({ showAiSettings: show }),
      setProvider: (provider) => set({ provider }),
      setGeminiKey: (key) => set({ geminiKey: key }),
      setOpenaiConfig: (config) => set((state) => ({ openaiConfig: typeof config === 'function' ? config(state.openaiConfig) : config })),
      setTaskConfigs: (configs) => set({ taskConfigs: configs }),
      updateTaskConfig: (taskName, patch) => set((state) => ({ taskConfigs: { ...state.taskConfigs, [taskName]: { ...state.taskConfigs[taskName], ...patch } } })),
      resetTaskConfigs: () => set({ taskConfigs: DEFAULT_TASK_CONFIGS }),
    }),
    {
      name: "character-card-game-store",
      storage: localStorageStorage,
      partialize: (state) => ({
        phase: state.phase,
        character: state.character,
        rules: state.rules,
        storyLog: state.storyLog,
        currentStory: state.currentStory,
        decisionHistory: state.decisionHistory,
        realityStats: state.realityStats,
        turnCount: state.turnCount,
        maxTurns: state.maxTurns,
        finalSummary: state.finalSummary,
        provider: state.provider,
        geminiKey: state.geminiKey,
        openaiConfig: state.openaiConfig,
        taskConfigs: state.taskConfigs,
      }),
    }
  )
);

export const usePhase = () => gameStore((s) => s.phase);
export const useCharacter = () => gameStore((s) => s.character);
export const useRules = () => gameStore((s) => s.rules);
export const useStoryLog = () => gameStore((s) => s.storyLog);
export const useCurrentStory = () => gameStore((s) => s.currentStory);
export const useDecisionHistory = () => gameStore((s) => s.decisionHistory);
export const useRealityStats = () => gameStore((s) => s.realityStats);
export const useTurnCount = () => gameStore((s) => s.turnCount);
export const useMaxTurns = () => gameStore((s) => s.maxTurns);
export const useFinalSummary = () => gameStore((s) => s.finalSummary);
export const useLoading = () => gameStore((s) => s.loading);
export const useCurrentTriggeredRules = () => gameStore((s) => s.currentTriggeredRules);
export const useNarrativeLoading = () => gameStore((s) => s.narrativeLoading);
export const useNarrativeStreamBuffer = () => gameStore((s) => s.narrativeStreamBuffer);
export const useRealityAnalysisLoading = () => gameStore((s) => s.realityAnalysisLoading);
export const useRealityAnalysis = () => gameStore((s) => s.realityAnalysis);
export const useWorldRulesLoading = () => gameStore((s) => s.worldRulesLoading);
export const useRuleStatusMap = () => gameStore((s) => s.ruleStatusMap);
export const useChoicesLoading = () => gameStore((s) => s.choicesLoading);
export const useShowAiSettings = () => gameStore((s) => s.showAiSettings);
export const useProvider = () => gameStore((s) => s.provider);
export const useGeminiKey = () => gameStore((s) => s.geminiKey);
export const useOpenaiConfig = () => gameStore((s) => s.openaiConfig);
export const useTaskConfigs = () => gameStore((s) => s.taskConfigs);
export const useTaskConfig = (taskName: TaskName) => gameStore((s) => s.taskConfigs[taskName]);

export const useSetPhase = () => gameStore((s) => s.setPhase);
export const useSetCharacter = () => gameStore((s) => s.setCharacter);
export const useSetRules = () => gameStore((s) => s.setRules);
export const useSetStoryLog = () => gameStore((s) => s.setStoryLog);
export const useSetCurrentStory = () => gameStore((s) => s.setCurrentStory);
export const useSetDecisionHistory = () => gameStore((s) => s.setDecisionHistory);
export const useSetRealityStats = () => gameStore((s) => s.setRealityStats);
export const useSetTurnCount = () => gameStore((s) => s.setTurnCount);
export const useSetMaxTurns = () => gameStore((s) => s.setMaxTurns);
export const useSetFinalSummary = () => gameStore((s) => s.setFinalSummary);
export const useSetLoading = () => gameStore((s) => s.setLoading);
export const useSetCurrentTriggeredRules = () => gameStore((s) => s.setCurrentTriggeredRules);
export const useSetNarrativeLoading = () => gameStore((s) => s.setNarrativeLoading);
export const useSetNarrativeStreamBuffer = () => gameStore((s) => s.setNarrativeStreamBuffer);
export const useSetRealityAnalysisLoading = () => gameStore((s) => s.setRealityAnalysisLoading);
export const useSetRealityAnalysis = () => gameStore((s) => s.setRealityAnalysis);
export const useSetWorldRulesLoading = () => gameStore((s) => s.setWorldRulesLoading);
export const useSetRuleStatusMap = () => gameStore((s) => s.setRuleStatusMap);
export const useSetChoicesLoading = () => gameStore((s) => s.setChoicesLoading);
export const useUpdateGameState = () => gameStore((s) => s.updateGameState);
export const useResetGame = () => gameStore((s) => s.resetGame);
export const useStartNewGame = () => gameStore((s) => s.startNewGame);
export const useSetShowAiSettings = () => gameStore((s) => s.setShowAiSettings);
export const useSetProvider = () => gameStore((s) => s.setProvider);
export const useSetGeminiKey = () => gameStore((s) => s.setGeminiKey);
export const useSetOpenaiConfig = () => gameStore((s) => s.setOpenaiConfig);
export const useSetTaskConfigs = () => gameStore((s) => s.setTaskConfigs);
export const useUpdateTaskConfig = () => gameStore((s) => s.updateTaskConfig);
export const useResetTaskConfigs = () => gameStore((s) => s.resetTaskConfigs);
