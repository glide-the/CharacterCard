import { AIConfig, Character, NarrativeTaskOutput, RuleCard, TaskAIConfig } from '../types';
import { executeWithRetry, generateContent } from './aiEngine';

interface NarrativeTaskInput {
  character: Character;
  choiceText: string;
  historySummary: string;
  activeRules: RuleCard[];
  turnCount: number;
  maxTurns: number;
}

const NARRATIVE_SYSTEM_PROMPT = `
你是「人格编年史」的主叙事官，必须维护世界稳定与叙事连续性。

【世界架构约束】
1) 世界基调：暗黑奇幻 + 塔罗宿命感 + 现实映射（信誉/压力/人脉）驱动社会反馈。
2) 因果一致：本轮叙事必须严格承接玩家上一行动和历史摘要，禁止突兀跳场景。
3) 规则可见性：如果规则正在生效，要在叙事中体现后果，但不要输出规则判定 JSON。
4) 人物一致性：必须符合角色 title/弱点/特质，不可写出与人设冲突的行为动机。
5) 文风：简体中文；画面具体、冷峻、克制，不写系统解释，不写元叙事。

【玩家体验与人称约束】
1) 叙事默认使用第二人称“你”，让玩家直接代入角色行动与感受。
2) 除了对话引号中的台词，不要切换到“我/他(她)”作为主叙事人称。
3) 不要把玩家称为“玩家”或“主角”，只使用“你”与角色称谓。
4) 感官描写要贴近角色体验：你看到/听到/感到/犹豫/决断。
5) 角色名可用于环境反馈，但不替代“你”作为主语。

【输出约束】
- 仅输出叙事正文。
- 长度建议 150-260 字。
- 禁止列点、禁止解释、禁止代码块。
`;

export async function runNarrativeTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: NarrativeTaskInput
): Promise<NarrativeTaskOutput> {
  const prompt = `
[角色]
${input.character.name}（${input.character.title}）
弱点：${input.character.weakness}

[回合]
${input.turnCount}/${input.maxTurns}

[激活规则]
${input.activeRules.map((r) => `- ${r.title}: ${r.description}`).join('\n')}

[历史摘要]
${input.historySummary}

[玩家本次选择]
${input.choiceText}

[任务]
生成下一段剧情叙事，要求风格稳定、因果清晰、可直接显示到中间叙事面板。
必须以“你”作为叙事主视角，让玩家体验该角色当下处境。
`;

  const narrativeText = await executeWithRetry(
    () => generateContent(
      {
        provider: provider.provider,
        gemini: provider.gemini,
        openai: provider.openai,
      },
      {
        prompt,
        systemInstruction: NARRATIVE_SYSTEM_PROMPT,
        jsonMode: false,
      },
      taskConfig
    ),
    taskConfig
  );

  return { narrativeText: narrativeText.trim() };
}
