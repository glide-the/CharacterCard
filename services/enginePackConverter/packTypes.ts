import type { DeterministicMappingResult, DeterministicRuntimeRuleCard } from "./mapper/deterministicMapper";
import type { LlmPromptAssets, LlmProtocolMappingResult } from "./mapper/llmProtocolMapper";

export interface EvaluationPackV1 {
  meta: DeterministicMappingResult["meta"];
  metrics: DeterministicMappingResult["metrics"];
  symbolDictionary: DeterministicMappingResult["symbolDictionary"];
  variableModel: DeterministicMappingResult["variableModel"] & {
    weights?: LlmProtocolMappingResult["variableStatWeights"];
  };
  ruleCatalog: DeterministicMappingResult["ruleCatalog"];
  runtimeRuleCards: DeterministicRuntimeRuleCard[];
  stateModel?: DeterministicMappingResult["stateModel"];
  pipelineHints: DeterministicMappingResult["pipelineHints"];
  packSummary?: DeterministicMappingResult["packSummary"];
  resourceManifest: DeterministicMappingResult["resourceManifest"];
  semanticArtifacts: DeterministicMappingResult["semanticArtifacts"];
  promptAssets?: LlmPromptAssets;
  warnings: string[];
  extensions: DeterministicMappingResult["extensions"];
}
