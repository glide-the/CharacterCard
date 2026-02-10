import { Type } from '@google/genai';
import { AIConfig, RuleCard, TaskAIConfig, WorldRulesTaskOutput } from '../types';
import { executeWithRetry, generateContent } from './aiEngine';

interface WorldRulesTaskInput {
  choiceText: string;
  narrativeText: string;
  rules: RuleCard[];
  turnCount: number;
}

const schema = {
  type: Type.OBJECT,
  properties: {
    triggeredRules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ruleId: { type: Type.STRING },
          ruleTitle: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
      },
    },
    ruleUpdates: {
      type: Type.OBJECT,
      properties: {
        activate: { type: Type.ARRAY, items: { type: Type.STRING } },
        deactivate: { type: Type.ARRAY, items: { type: Type.STRING } },
        add: { type: Type.ARRAY, items: { type: Type.OBJECT } },
        removeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    ruleStatusMap: { type: Type.OBJECT },
  },
};

export async function runWorldRulesTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: WorldRulesTaskInput
): Promise<WorldRulesTaskOutput> {
  const prompt = `回合:${input.turnCount}\n选择:${input.choiceText}\n叙事:${input.narrativeText}\n规则:${JSON.stringify(input.rules)}`;
  const response = await executeWithRetry(
    () => generateContent({ provider: provider.provider, gemini: provider.gemini, openai: provider.openai }, {
      prompt,
      systemInstruction: '你是世界法则裁定引擎，输出JSON。',
      jsonSchema: schema,
      jsonMode: true,
    }, taskConfig),
    taskConfig
  );
  return JSON.parse(response) as WorldRulesTaskOutput;
}
