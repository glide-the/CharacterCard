import type { TaskPromptOverrides } from "../types";

const normalizeBlock = (value?: string) => value?.trim() || "";

export const applySystemPromptOverrides = (basePrompt: string, overrides?: TaskPromptOverrides): string => {
  const override = normalizeBlock(overrides?.systemPrompt);
  if (!override) return basePrompt;
  return `${override}\n\n${basePrompt}`;
};

export const applyPromptOverrides = (basePrompt: string, overrides?: TaskPromptOverrides): string => {
  const prefix = normalizeBlock(overrides?.promptPrefix);
  const suffix = normalizeBlock(overrides?.promptSuffix);
  const parts = [prefix, basePrompt, suffix].filter((part) => part && part.length > 0);
  return parts.join("\n\n");
};
