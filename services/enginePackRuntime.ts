import type { RuleCard, TaskPromptOverrideMap } from "../types";
import type { EvaluationPackV1 } from "./enginePackConverter/packTypes";
import { getEnginePackId, toRuntimeRules, toTaskPromptOverrides } from "./enginePackConverter/runtimeAdapter";

export interface EnginePackRuntimePayload {
  id: string;
  sourceUrl: string;
  rules: RuleCard[];
  promptOverrides: TaskPromptOverrideMap;
  pack: EvaluationPackV1;
}

export const DEFAULT_ENGINE_PACK_URL = "/engine-pack/evaluation-pack.v1.json";

export const resolveEnginePackUrl = (): string => {
  const envValue = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ENGINE_PACK_URL;
  return envValue || DEFAULT_ENGINE_PACK_URL;
};

const isRuntimePack = (value: any): value is EvaluationPackV1 => {
  return Boolean(value && Array.isArray(value.runtimeRuleCards));
};

function toRuntimePayload(pack: EvaluationPackV1, sourceUrl: string): EnginePackRuntimePayload {
  return {
    id: getEnginePackId(pack),
    sourceUrl,
    rules: toRuntimeRules(pack),
    promptOverrides: toTaskPromptOverrides(pack),
    pack,
  };
}

export function parseEnginePackRaw(raw: unknown, sourceUrl: string): EnginePackRuntimePayload {
  if (!isRuntimePack(raw)) {
    throw new Error("Engine pack payload missing runtimeRuleCards");
  }
  return toRuntimePayload(raw, sourceUrl);
}

export function parseEnginePackText(rawText: string, sourceUrl: string): EnginePackRuntimePayload {
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Engine pack JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parseEnginePackRaw(raw, sourceUrl);
}

export async function loadEnginePackFromFile(file: File): Promise<EnginePackRuntimePayload> {
  const sourceUrl = `upload://${file.name || "engine-pack.json"}`;
  const rawText = await file.text();
  return parseEnginePackText(rawText, sourceUrl);
}

export async function loadEnginePackFromUrl(sourceUrl: string): Promise<EnginePackRuntimePayload> {
  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Engine pack fetch failed: ${response.status} ${response.statusText}`);
  }
  return parseEnginePackRaw(await response.json(), sourceUrl);
}
