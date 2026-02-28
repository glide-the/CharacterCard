import type { RuleCard, TaskPromptOverrideMap } from "../../types";
import type { EvaluationPackV1 } from "./packTypes";

const UNKNOWN_RULE_FALLBACK: RuleCard["type"] = "REALITY";

const combineDescription = (condition?: string, action?: string, fallback?: string) => {
  const trimmedCondition = condition?.trim();
  const trimmedAction = action?.trim();
  if (trimmedCondition && trimmedAction) {
    return `${trimmedCondition} -> ${trimmedAction}`;
  }
  if (trimmedCondition) return trimmedCondition;
  if (trimmedAction) return trimmedAction;
  return fallback || "";
};

export const getEnginePackId = (pack: EvaluationPackV1): string => {
  const sourceName = pack.meta.sourceName?.trim() || "engine-pack";
  const sourceVersion = pack.meta.sourceVersion?.trim() || "unknown";
  return `${sourceName}@${sourceVersion}`;
};

export const toRuntimeRules = (pack: EvaluationPackV1): RuleCard[] => {
  return pack.runtimeRuleCards.map((card) => ({
    id: card.propositionId || card.id,
    title: card.title || card.propositionId || card.ruleId,
    type: card.type === "UNKNOWN" ? UNKNOWN_RULE_FALLBACK : card.type,
    description: combineDescription(card.condition, card.action, card.title),
    effect: card.action || undefined,
    active: true,
  }));
};

export const toTaskPromptOverrides = (pack: EvaluationPackV1): TaskPromptOverrideMap => {
  const assets = pack.promptAssets;
  if (!assets) return {};

  const suffixParts: string[] = [];
  if (assets.constraints?.trim()) {
    suffixParts.push(`【约束】\n${assets.constraints.trim()}`);
  }
  if (assets.examples?.trim()) {
    suffixParts.push(`【示例】\n${assets.examples.trim()}`);
  }
  const promptSuffix = suffixParts.length ? suffixParts.join("\n\n") : undefined;

  return {
    narrative: {
      systemPrompt: assets.systemPrompt?.trim(),
      promptSuffix,
    },
    choices: {
      systemPrompt: assets.systemPrompt?.trim(),
      promptSuffix,
    },
    realityMapping: {
      promptSuffix,
    },
    worldRules: {
      promptSuffix,
    },
  };
};
