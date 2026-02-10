import { Type } from '@google/genai';
import { AIConfig, ChoicesTaskOutput, TaskAIConfig } from '../types';
import { executeWithRetry, generateContent } from './aiEngine';

interface ChoicesTaskInput {
  narrativeText: string;
  historySummary: string;
}

const schema = {
  type: Type.OBJECT,
  properties: {
    choices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING },
          consequence: { type: Type.STRING },
          cost: { type: Type.STRING },
          risk: { type: Type.STRING },
        },
      },
    },
  },
};

export async function runChoicesTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: ChoicesTaskInput
): Promise<ChoicesTaskOutput> {
  const prompt = `叙事:${input.narrativeText}\n历史:${input.historySummary}\n生成3个选项`; 
  const response = await executeWithRetry(
    () => generateContent({ provider: provider.provider, gemini: provider.gemini, openai: provider.openai }, {
      prompt,
      systemInstruction: '你是TRPG选项生成器，输出JSON。',
      jsonSchema: schema,
      jsonMode: true,
    }, taskConfig),
    taskConfig
  );
  return JSON.parse(response) as ChoicesTaskOutput;
}
