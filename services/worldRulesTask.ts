import { Type } from '@google/genai';
import { AIConfig, RuleCard, TaskAIConfig, WorldRulesTaskOutput } from '../types';
import { executeWithRetry, generateContent } from './aiEngine';

interface WorldRulesTaskInput {
  choiceText: string;
  playerDirective?: string;
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
        required: ['ruleId', 'ruleTitle', 'reason'],
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
      required: ['activate', 'deactivate', 'add', 'removeIds'],
    },
    ruleStatusMap: { type: Type.OBJECT },
  },
  required: ['triggeredRules', 'ruleUpdates', 'ruleStatusMap'],
};

const WORLD_RULES_SYSTEM_PROMPT = `
你是「世界法则裁定引擎」。
你的目标是维护规则系统稳定，保证触发判定一致且可回放。

【状态定义】
- triggered: 本轮触发
- active_not_triggered: 激活但未触发
- inactive: 休眠

【裁定要求】
1) 必须基于玩家选择 + 叙事结果 + 当前规则清单裁定。
1.1) 若存在玩家剧情要求，必须判断其与当前局势的因果关系，并体现在触发原因中。
2) 不允许同一规则同时 activate 与 deactivate。
3) 新增规则 add 时必须符合既有世界观与暗黑奇幻风格。
4) removeIds 仅用于剧情上已彻底失效的规则。
5) ruleStatusMap 应覆盖输入规则的所有 id。
6) reason 需简体中文，可直接给玩家展示。
7) 优先保持规则系统简洁：若无必要，本回合不新增规则；避免叠加过多限制影响流程收束。
8) 当剧情已进入后期或收束阶段，应减少限制性裁定，避免阻断正常结局推进。
9) 只输出 JSON。
`;

export async function runWorldRulesTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: WorldRulesTaskInput
): Promise<WorldRulesTaskOutput> {
  const prompt = `
[回合]
${input.turnCount}

[玩家选择]
${input.choiceText}

[玩家剧情要求]
${input.playerDirective?.trim() || '（无额外要求）'}

[叙事结果]
${input.narrativeText}

[规则清单]
${input.rules.map((rule) => `- id=${rule.id}, title=${rule.title}, active=${rule.active}, desc=${rule.description}`).join('\n')}

[任务]
输出触发规则、规则状态流转、完整 ruleStatusMap。
严格避免“随机触发”措辞，所有 reason 必须解释规则为何在本叙事脉络下必然变化。
`;

  const response = await executeWithRetry(
    () => generateContent(
      { provider: provider.provider, gemini: provider.gemini, openai: provider.openai },
      {
        prompt,
        systemInstruction: WORLD_RULES_SYSTEM_PROMPT,
        jsonSchema: schema,
        jsonMode: true,
      },
      taskConfig
    ),
    taskConfig
  );

  return JSON.parse(response) as WorldRulesTaskOutput;
}
