import { describe, expect, it, vi } from "vitest";
import { CHARACTERS, DEFAULT_TASK_CONFIGS, INITIAL_RULES } from "../../constants";
import type { RuleCard, TurnAIConfig } from "../../types";

const narrativeMock = vi.fn(async () => ({ narrativeText: "你踏入城门，阴影在石墙间翻涌。" }));
const realityMock = vi.fn(async () => ({
  statUpdates: { credibility: 1, stress: 0, connections: -1 },
  statAnalysis: [
    {
      statKey: "credibility",
      newValue: 6,
      status: "safe",
      threshold: 3,
      warningMessage: "信誉尚稳。",
      reason: "守卫暂时认可你的说辞。",
    },
  ],
}));
const worldRulesMock = vi.fn(async (_provider: unknown, _taskConfig: unknown, input: { rules: RuleCard[] }) => ({
  triggeredRules: [
    { ruleId: input.rules[0]?.id || "r1", ruleTitle: input.rules[0]?.title || "规则", reason: "你的举动触发了戒备。" },
  ],
  ruleUpdates: { activate: [], deactivate: [], add: [], removeIds: [] },
  ruleStatusMap: Object.fromEntries(
    (input.rules || []).map((rule) => [rule.id, rule.id === input.rules[0]?.id ? "triggered" : "active_not_triggered"])
  ),
}));
const choicesMock = vi.fn(async () => ({
  choices: [
    { id: "hold", text: "按兵不动", consequence: "暂缓行动" },
    { id: "probe", text: "试探守卫", consequence: "寻找破绽" },
    { id: "risk", text: "强行闯入", consequence: "冒险推进" },
  ],
}));

vi.mock("../../services/narrativeTask", () => ({ runNarrativeTask: narrativeMock }));
vi.mock("../../services/realityMappingTask", () => ({ runRealityMappingTask: realityMock }));
vi.mock("../../services/worldRulesTask", () => ({ runWorldRulesTask: worldRulesMock }));
vi.mock("../../services/choicesTask", () => ({ runChoicesTask: choicesMock }));

describe("orchestrateTurn smoke", () => {
  it("runs one round with rule trigger and stat update", async () => {
    const { orchestrateTurn } = await import("../../services/turnOrchestrator");
    const rules = INITIAL_RULES.slice(0, 3);
    const config: TurnAIConfig = {
      provider: { provider: "openai", openai: { apiKey: "test", baseUrl: "http://localhost", model: "gpt-4.1-mini" } },
      tasks: DEFAULT_TASK_CONFIGS,
    };

    const result = await orchestrateTurn({
      character: CHARACTERS[0],
      rules,
      realityStats: { credibility: 5, stress: 4, connections: 4 },
      choiceText: "向守卫低头并递交通行证明。",
      historySummary: "你一路赶到橡树港，准备入城。",
      turnCount: 1,
      maxTurns: 5,
      config,
    });

    expect(worldRulesMock).toHaveBeenCalled();
    expect(result.engineResult.triggeredRules?.length).toBeGreaterThan(0);
    expect(result.engineResult.statUpdates.credibility).toBe(1);
    expect(result.engineResult.storyNode.text.length).toBeGreaterThan(0);
  });
});
