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
      required: ['credibility', 'stress', 'connections'],
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
        required: ['statKey', 'newValue', 'status', 'warningMessage', 'reason'],
      },
    },
  },
  required: ['statUpdates', 'statAnalysis'],
};

const REALITY_SYSTEM_PROMPT = `
你是「现实映射分析引擎」。
你的职责是把叙事后果映射到三维现实变量，并保持世界稳定。

【硬阈值】
- credibility：<3 触发，<5 预警
- stress：>8 触发，>6 预警
- connections：<2 触发，<4 预警

【分析规则】
1) 输出必须稳定、可解释，禁止随机夸张跳变。
2) 每项 statUpdates 变化建议在 [-3, +3]，仅在叙事确有重大事件时使用极值。
3) status 必须与 newValue 和阈值一致。
4) warningMessage 与 reason 必须是简体中文，且能直接展示给玩家。
5) 精神压力（stress）与“精神损耗”是同一数值指标（仅名称不同）。
6) 只有玩家选择“C. 暂不行动”时，stress 才允许出现负增量（减压）；其他任何行动都不得降低 stress。
7) 只输出 JSON，不输出解释文本。
`;

const HOLD_CHOICE_KEYWORDS = ['C. 暂不行动', '暂不行动'];

const isHoldChoice = (choiceText: string): boolean =>
  HOLD_CHOICE_KEYWORDS.some((keyword) => choiceText.includes(keyword));

export async function runRealityMappingTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: RealityMappingTaskInput
): Promise<RealityMappingTaskOutput> {
  const prompt = `
[角色]
${input.character.name}（${input.character.title}）
弱点：${input.character.weakness}

[玩家行为]
${input.choiceText}

[叙事结果]
${input.narrativeText}

[当前属性]
信誉=${input.stats.credibility}, 压力=${input.stats.stress}, 人脉=${input.stats.connections}

[激活规则]
${input.activeRules.map((r) => `- ${r.title}: ${r.description}`).join('\n')}

[任务]
评估属性变化，给出 statUpdates 与 statAnalysis。
`;

  const response = await executeWithRetry(
    () => generateContent(
      { provider: provider.provider, gemini: provider.gemini, openai: provider.openai },
      {
        prompt,
        systemInstruction: REALITY_SYSTEM_PROMPT,
        jsonSchema: schema,
        jsonMode: true,
      },
      taskConfig
    ),
    taskConfig
  );

  return normalizeRealityMappingResult(JSON.parse(response) as RealityMappingTaskOutput, input);
}

function normalizeRealityMappingResult(
  output: RealityMappingTaskOutput,
  input: RealityMappingTaskInput
): RealityMappingTaskOutput {
  const normalized = { ...output, statUpdates: { ...output.statUpdates } };
  const holdChoice = isHoldChoice(input.choiceText);

  if (holdChoice) {
    normalized.statUpdates.stress = Math.min(-1, normalized.statUpdates.stress);
  } else {
    normalized.statUpdates.stress = Math.max(0, normalized.statUpdates.stress);
  }

  return normalized;
}
