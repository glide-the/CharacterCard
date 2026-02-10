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

export async function runNarrativeTask(
  provider: AIConfig,
  taskConfig: TaskAIConfig,
  input: NarrativeTaskInput
): Promise<NarrativeTaskOutput> {
  const prompt = `
角色: ${input.character.name}（${input.character.title}）
玩家选择: ${input.choiceText}
当前回合: ${input.turnCount}/${input.maxTurns}
激活规则: ${input.activeRules.map((r) => `${r.title}:${r.description}`).join('\n')}
历史摘要: ${input.historySummary}

请生成一段简体中文暗黑奇幻叙事，作为下一段剧情内容。
`;

  const narrativeText = await executeWithRetry(
    () => generateContent({
      provider: provider.provider,
      gemini: provider.gemini,
      openai: provider.openai,
    }, {
      prompt,
      systemInstruction: '你是TRPG叙事引擎，仅输出叙事正文，不要添加解释。',
      jsonMode: false,
    }, taskConfig),
    taskConfig
  );

  return { narrativeText: narrativeText.trim() };
}
