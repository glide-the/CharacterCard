import { AIConfig, Character, NarrativeTaskOutput, RuleCard, TaskAIConfig } from '../types';
import { executeWithRetry, generateContent } from './aiEngine';

interface NarrativeTaskInput {
  character: Character;
  choiceText: string;
  playerDirective?: string;
  historySummary: string;
  activeRules: RuleCard[];
  turnCount: number;
  maxTurns: number;
}

interface FinalSummaryTaskInput {
  character: Character;
  historySummary: string;
  finalNarrativeText: string;
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
6) 深层逻辑：规则变化必须由场景冲突、角色动机与既往因果共同驱动，禁止把规则变化写成随机事件。

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

const FINAL_SUMMARY_SYSTEM_PROMPT = `
你是「人格编年史」的终局解读官。

【目标】
输出一段有思想密度的终局总结，不只复述剧情，还要交代玩家在“现实-虚拟链接规则”上的收获与困惑。

【必须覆盖的四个维度】
1) 链接现实与虚拟规则：
   - 区分“情境唤起”（游戏选择让人想起现实处境）、
   - “机制映射”（游戏规则模拟社会机制）、
   - “迁移学习”（把游戏中形成的判断带回现实）。
   - 结合本局实际，判断更接近哪一种，是否同时发生。
2) 重新定义游戏的冲动：
   - 点明它何时推动了有效决策，何时可能只是意义包装。
   - 保持克制，不做绝对论断。
3) 动态规则的真实性：
   - 判断本局规则变化更像“深层叙事驱动”还是“预设空间抽样”。
   - 给出依据（来自剧情因果、角色动机、规则触发链）。
4) 玩家学到的能力类型：
   - 区分“通用判断力提升”与“系统内适应技巧”。
   - 明确写出两者比例或倾向，不夸张。

【写作要求】
- 简体中文，第二人称“你”为主。
- 文风冷静、具体、有张力，但避免煽情口号。
- 长度 220-360 字。
- 只输出正文，不要标题、分点、JSON、解释文本。
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

[玩家剧情要求]
${input.playerDirective?.trim() || '（无额外要求）'}

[任务]
生成下一段剧情叙事，要求风格稳定、因果清晰、可直接显示到中间叙事面板。
必须以“你”作为叙事主视角，让玩家体验该角色当下处境。
若玩家提供了剧情要求，请优先将其融入当前冲突，并确保规则变化体现为“叙事必然结果”，而非随机抽样。
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

export async function runFinalSummaryTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: FinalSummaryTaskInput
): Promise<string> {
  const prompt = `
[角色]
${input.character.name}（${input.character.title}）
弱点：${input.character.weakness}

[终局回合]
${input.turnCount}/${input.maxTurns}

[激活规则]
${input.activeRules.map((r) => `- ${r.title}: ${r.description}`).join('\n') || '（无）'}

[历史摘要]
${input.historySummary}

[终局叙事片段]
${input.finalNarrativeText}

[任务]
生成终局总结，必须覆盖系统提示中的四个维度，并基于本局因果给出克制判断。
`;

  const summary = await executeWithRetry(
    () => generateContent(
      {
        provider: provider.provider,
        gemini: provider.gemini,
        openai: provider.openai,
      },
      {
        prompt,
        systemInstruction: FINAL_SUMMARY_SYSTEM_PROMPT,
        jsonMode: false,
      },
      taskConfig
    ),
    taskConfig
  );

  return summary.trim();
}
