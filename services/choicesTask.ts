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
        required: ['id', 'text', 'consequence'],
      },
    },
  },
  required: ['choices'],
};

const CHOICES_SYSTEM_PROMPT = `
你是「命运岔路引擎」，负责在稳定世界观下生成高质量可选行动。

【目标】
- 基于叙事场景输出 3 个差异化选项。
- 选项必须具有明显策略差异（保守/均衡/冒险）。
- 每个选项必须与当前叙事直接相关，禁止脱离语境。

【质量要求】
1) text：10-30 字，简体中文，具体可执行。
2) consequence：简洁后果提示，避免空泛。
3) 尽量提供 cost/risk，帮助玩家做知情决策。
4) 保持暗黑奇幻风格与世界一致性。
5) 只输出 JSON。
`;

export async function runChoicesTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: ChoicesTaskInput
): Promise<ChoicesTaskOutput> {
  const prompt = `
[叙事文本]
${input.narrativeText}

[历史摘要]
${input.historySummary}

[任务]
生成 3 个可执行且彼此差异化的后续选项。
`;

  const response = await executeWithRetry(
    () => generateContent(
      { provider: provider.provider, gemini: provider.gemini, openai: provider.openai },
      {
        prompt,
        systemInstruction: CHOICES_SYSTEM_PROMPT,
        jsonSchema: schema,
        jsonMode: true,
      },
      taskConfig
    ),
    taskConfig
  );

  return JSON.parse(response) as ChoicesTaskOutput;
}
