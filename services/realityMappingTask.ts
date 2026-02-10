import { Type } from '@google/genai';
import { AIConfig, Character, RealityMappingTaskOutput, RuleCard, TaskAIConfig } from '../types';
import { executeWithRetry, generateContent } from './aiEngine';

interface RealityMappingTaskInput {
  character: Character;
  choiceText: string;
  narrativeText: string;
  stats: { credibility: number; stress: number; connections: number };
  activeRules: RuleCard[];
}

const schema = {
  type: Type.OBJECT,
  properties: {
    statUpdates: {
      type: Type.OBJECT,
      properties: {
        credibility: { type: Type.INTEGER },
        stress: { type: Type.INTEGER },
        connections: { type: Type.INTEGER },
      },
    },
    statAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          statKey: { type: Type.STRING, enum: ['credibility', 'stress', 'connections'] },
          newValue: { type: Type.INTEGER },
          status: { type: Type.STRING, enum: ['safe', 'warning', 'triggered'] },
          threshold: { type: Type.INTEGER },
          warningMessage: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
      },
    },
  },
};

export async function runRealityMappingTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: RealityMappingTaskInput
): Promise<RealityMappingTaskOutput> {
  const prompt = `角色: ${input.character.name}\n选择: ${input.choiceText}\n叙事: ${input.narrativeText}\n当前属性: ${JSON.stringify(input.stats)}\n规则: ${input.activeRules.map((r) => `${r.title}:${r.description}`).join('\n')}`;
  const response = await executeWithRetry(
    () => generateContent({ provider: provider.provider, gemini: provider.gemini, openai: provider.openai }, {
      prompt,
      systemInstruction: '你是现实映射分析引擎。输出JSON。',
      jsonSchema: schema,
      jsonMode: true,
    }, taskConfig),
    taskConfig
  );
  return JSON.parse(response) as RealityMappingTaskOutput;
}
