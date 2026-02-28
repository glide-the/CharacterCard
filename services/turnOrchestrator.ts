import { DEFAULT_TASK_CONFIGS } from '../constants';
import {
  EngineResult,
  Character,
  RuleCard,
  StoryChoice,
  TurnAIConfig,
  RealityMappingTaskOutput,
  WorldRulesTaskOutput,
  TaskPromptOverrideMap,
} from '../types';
import { processTurn } from './geminiService';
import { runNarrativeTask } from './narrativeTask';
import { runRealityMappingTask } from './realityMappingTask';
import { runWorldRulesTask } from './worldRulesTask';
import { runChoicesTask } from './choicesTask';

interface OrchestratorInput {
  character: Character;
  rules: RuleCard[];
  realityStats: { credibility: number; stress: number; connections: number };
  choiceText: string;
  historySummary: string;
  turnCount: number;
  maxTurns: number;
  config: TurnAIConfig;
  promptOverrides?: TaskPromptOverrideMap;
}

export interface OrchestratorTurnResult {
  engineResult: EngineResult;
  realityAnalysis: RealityMappingTaskOutput['statAnalysis'];
  ruleStatusMap: WorldRulesTaskOutput['ruleStatusMap'];
}

const defaultChoices: StoryChoice[] = [
  { id: 'retry', text: '重试当前计划', consequence: '谨慎推进' },
  { id: 'hold', text: '按兵不动', consequence: '观察局势变化并保留余地', risk: '可能错失先机' },
  { id: 'risk', text: '孤注一掷', consequence: '高风险突破' },
];

export async function orchestrateTurn(input: OrchestratorInput): Promise<OrchestratorTurnResult> {
  const taskConfigs = input.config.tasks || DEFAULT_TASK_CONFIGS;

  try {
    const narrative = await runNarrativeTask(input.config.provider, taskConfigs.narrative, {
      character: input.character,
      choiceText: input.choiceText,
      historySummary: input.historySummary,
      activeRules: input.rules.filter((r) => r.active),
      turnCount: input.turnCount,
      maxTurns: input.maxTurns,
      promptOverrides: input.promptOverrides?.narrative,
    });


    const narrativeText = narrative.narrativeText?.trim();
    if (!narrativeText) {
      throw new Error('Narrative task returned empty narrative text');
    }

    const [realityResult, worldRulesResult, choicesResult] = await Promise.all([
      runRealityMappingTask(input.config.provider, taskConfigs.realityMapping, {
        character: input.character,
        choiceText: input.choiceText,
        narrativeText: narrativeText,
        stats: input.realityStats,
        activeRules: input.rules.filter((r) => r.active),
        promptOverrides: input.promptOverrides?.realityMapping,
      }).catch(() => ({
        statUpdates: { credibility: 0, stress: 0, connections: 0 },
        statAnalysis: [],
      })),
      runWorldRulesTask(input.config.provider, taskConfigs.worldRules, {
        choiceText: input.choiceText,
        narrativeText: narrativeText,
        rules: input.rules,
        turnCount: input.turnCount,
        promptOverrides: input.promptOverrides?.worldRules,
      }).catch(() => ({
        triggeredRules: [],
        ruleUpdates: { activate: [], deactivate: [], add: [], removeIds: [] },
        ruleStatusMap: {},
      })),
      runChoicesTask(input.config.provider, taskConfigs.choices, {
        narrativeText: narrativeText,
        historySummary: input.historySummary,
        promptOverrides: input.promptOverrides?.choices,
      }).catch(() => ({ choices: defaultChoices })),
    ]);

    const isFinalTurn = input.turnCount >= input.maxTurns;

    return {
      engineResult: {
        storyNode: {
          text: narrativeText,
          choices: isFinalTurn ? [] : (choicesResult.choices?.length ? choicesResult.choices : defaultChoices),
        },
        statUpdates: realityResult.statUpdates || { credibility: 0, stress: 0, connections: 0 },
        ruleUpdates: {
          add: worldRulesResult.ruleUpdates?.add || [],
          removeIds: worldRulesResult.ruleUpdates?.removeIds || [],
          activate: worldRulesResult.ruleUpdates?.activate || [],
          deactivate: worldRulesResult.ruleUpdates?.deactivate || [],
        },
        triggeredRules: worldRulesResult.triggeredRules,
        isGameOver: isFinalTurn,
        gameSummary: isFinalTurn ? '终局已至，命运尘埃落定。' : undefined,
      },
      realityAnalysis: realityResult.statAnalysis || [],
      ruleStatusMap: worldRulesResult.ruleStatusMap || {},
    };
  } catch {
    const fallback = await processTurn(
      input.character,
      input.rules.filter((r) => r.active),
      input.realityStats,
      input.choiceText,
      input.historySummary,
      input.turnCount,
      input.maxTurns,
      input.config.provider,
      input.promptOverrides?.narrative
    );

    return {
      engineResult: fallback,
      realityAnalysis: [],
      ruleStatusMap: {},
    };
  }
}
