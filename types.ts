
export enum Phase {
  SELECTION = 'SELECTION',
  DESIGN_CONFIG = 'DESIGN_CONFIG',
  LOADING = 'LOADING',
  GAMEPLAY = 'GAMEPLAY',
  DECISION_MAP = 'DECISION_MAP',
  GAME_OVER = 'GAME_OVER'
}

export interface Character {
  id: string;
  name: string;
  title: string;
  description: string;
  imageUrl: string;
  stats: {
    strength: number;
    wits: number;
    charm: number;
  };
  traits: string[];
  weakness: string;
}

export interface RuleCard {
  id: string;
  title: string;
  type: 'CONSTRAINT' | 'BONUS' | 'RISK' | 'REALITY';
  description: string;
  active: boolean;
  effect?: string;
}

export type StatKey = 'credibility' | 'stress' | 'connections';

export type RuleTooltipMode = 'triggered' | 'active' | 'inactive';

export interface ParsedRuleLink {
  statKey: StatKey;
  statLabel: string;
  currentValue: number;
  threshold: number | null;
  direction: 'below' | 'above' | 'none';
  isTriggered: boolean;
  warningMessage: string;
}

export interface ParsedRuleMapping {
  rule: RuleCard;
  linkedStats: ParsedRuleLink[];
  isAnyTriggered: boolean;
}

export interface StoryChoice {
  id: string;
  text: string;
  consequence: string; // Used for AI context
  cost?: string;
  risk?: string;
}

export interface StoryNode {
  text: string;
  choices: StoryChoice[];
  background?: string;
}

// 触发的规则信息
export interface TriggeredRule {
  ruleId: string;
  ruleTitle: string;
  reason: string; // 触发原因
}

// 新增：AI 计算后的状态变更指令
export interface EngineResult {
  storyNode: StoryNode;
  statUpdates: {
    credibility?: number; // 增量，例如 -1 或 +2
    stress?: number;
    connections?: number;
  };
  ruleUpdates: {
    add?: RuleCard[];
    removeIds?: string[];
    activate?: string[];
    deactivate?: string[];
  };
  triggeredRules?: TriggeredRule[]; // 本轮触发的规则及原因
  isGameOver: boolean;
  gameSummary?: string; // 仅在 isGameOver 为 true 时存在
}

export interface GameState {
  phase: Phase;
  character: Character | null;
  rules: RuleCard[];
  storyLog: StoryNode[];
  currentStory: StoryNode | null;
  decisionHistory: DecisionRecord[];
  realityStats: {
    credibility: number;
    stress: number;
    connections: number;
  };
  turnCount: number; // 当前推进的时间线节点
  maxTurns: number;  // 预设的剧本长度
  finalSummary?: string;
}

export interface DecisionRecord {
  turn: number;
  sceneTextPreview: string;
  chosenOptionText: string;
  chosenOptionId: string;
  triggeredRules: TriggeredRule[];
  statSnapshot: {
    credibility: number;
    stress: number;
    connections: number;
  };
  statDelta: {
    credibility: number;
    stress: number;
    connections: number;
  };
}

// AI Configuration Types
export type ServiceProvider = 'gemini' | 'openai';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIConfig {
  provider: ServiceProvider;
  gemini?: {
    apiKey?: string;
  };
  openai?: OpenAIConfig;
}

export type TaskName = 'narrative' | 'realityMapping' | 'worldRules' | 'choices';

export interface TaskPromptOverrides {
  systemPrompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
}

export type TaskPromptOverrideMap = Partial<Record<TaskName, TaskPromptOverrides>>;

export interface TaskAIConfig {
  geminiModel?: string;
  openaiModel?: string;
  temperature: number;
  maxOutputTokens: number;
  topP?: number;
  topK?: number;
  jsonMode: boolean;
  streaming: boolean;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface TurnAIConfig {
  provider: AIConfig;
  tasks: Record<TaskName, TaskAIConfig>;
}

export interface RealityMappingTaskOutput {
  statUpdates: {
    credibility: number;
    stress: number;
    connections: number;
  };
  statAnalysis: Array<{
    statKey: StatKey;
    newValue: number;
    status: 'safe' | 'warning' | 'triggered';
    threshold: number | null;
    warningMessage: string;
    reason: string;
  }>;
}

export interface WorldRulesTaskOutput {
  triggeredRules: TriggeredRule[];
  ruleUpdates: {
    activate: string[];
    deactivate: string[];
    add: RuleCard[];
    removeIds: string[];
  };
  ruleStatusMap: Record<string, 'triggered' | 'active_not_triggered' | 'inactive'>;
}

export interface ChoicesTaskOutput {
  choices: StoryChoice[];
}

export interface NarrativeTaskOutput {
  narrativeText: string;
}
