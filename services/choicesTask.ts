import { Type } from '@google/genai';
import { AIConfig, ChoicesTaskOutput, TaskAIConfig } from '../types';
import { executeWithRetry, generateContent } from './aiEngine';

interface ChoicesTaskInput {
  narrativeText: string;
  historySummary: string;
  playerDirective?: string;
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
- “暂不行动/按兵不动”仅在剧情存在观望窗口时出现；若出现，必须是唯一的减轻精神压力路径。
- 选项必须具有明显策略差异（保守/均衡/冒险）。
- 每个选项必须与当前叙事直接相关，禁止脱离语境。

【质量要求】
0) 选项必须从当前叙事因果链推导，不允许看起来像从预设池随机抽取。
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

[玩家剧情要求]
${input.playerDirective?.trim() || '（无额外要求）'}

[任务]
生成 3 个可执行且彼此差异化的后续选项。
如果玩家提供剧情要求，至少 1 个选项要直接回应该要求。
仅在剧情允许观望/等待/潜伏时，加入“暂不行动”策略选项。
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

  return normalizeChoices(JSON.parse(response) as ChoicesTaskOutput);
}


const HOLD_CHOICE_MATCHER = /暂不行动|按兵不动|观望|等待/;

function stripChoicePrefix(text: string): string {
  return text.replace(/^([A-C]\.\s*)?/, '');
}

function normalizeChoices(output: ChoicesTaskOutput): ChoicesTaskOutput {
  const baseChoices = [...(output.choices || [])].slice(0, 3);
  const holdChoices = baseChoices.filter((choice) => HOLD_CHOICE_MATCHER.test(choice.text));
  const nonHoldChoices = baseChoices.filter((choice) => !HOLD_CHOICE_MATCHER.test(choice.text));

  while (nonHoldChoices.length < 3) {
    nonHoldChoices.push({
      id: `fallback_${nonHoldChoices.length + 1}`,
      text: nonHoldChoices.length === 0
        ? '谨慎试探局势'
        : nonHoldChoices.length === 1
          ? '稳步推进目标'
          : '冒险强攻突破',
      consequence: nonHoldChoices.length === 0
        ? '小幅推进并收集信息'
        : nonHoldChoices.length === 1
          ? '维持节奏并争取主动'
          : '快速突破，但风险上升',
      risk: nonHoldChoices.length < 2 ? '收益有限' : '可能引发连锁后果'
    });
  }

  if (holdChoices.length === 0) {
    return {
      choices: nonHoldChoices.slice(0, 3).map((choice, idx) => ({
        ...choice,
        text: `${String.fromCharCode(65 + idx)}. ${stripChoicePrefix(choice.text)}`
      }))
    };
  }

  const selectedHold = holdChoices[0];
  return {
    choices: [
      {
        ...nonHoldChoices[0],
        text: `A. ${stripChoicePrefix(nonHoldChoices[0].text)}`
      },
      {
        ...nonHoldChoices[1],
        text: `B. ${stripChoicePrefix(nonHoldChoices[1].text)}`
      },
      {
        ...selectedHold,
        id: selectedHold.id || 'hold',
        text: 'C. 暂不行动',
        consequence: selectedHold.consequence || '保持观望，尝试平复精神压力',
        risk: selectedHold.risk || '可能错失主动权'
      }
    ]
  };
}
