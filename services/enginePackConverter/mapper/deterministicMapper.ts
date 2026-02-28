import type { NormalizedEnginePack, ParsedMarkdownAsset } from "../types";
import type { LlmPromptAssets } from "./llmProtocolMapper";

export type DeterministicRuleType = "CONSTRAINT" | "BONUS" | "RISK" | "REALITY" | "UNKNOWN";

export interface DeterministicRuleCatalogEntry {
  id: string;
  name: string;
  definition?: string;
  constraints?: string[];
  advanced?: Record<string, unknown>;
}

export interface DeterministicRuntimeRuleCard {
  id: string;
  propositionId: string;
  ruleId: string;
  title: string;
  condition: string;
  action: string;
  priority: number | null;
  type: DeterministicRuleType;
}

export interface DeterministicSymbolEntry {
  id: string;
  label: string;
  definition?: string;
  constraints?: string[];
  kind?: string;
}

export type TraceEntry = {
  id?: string;
  targetPath: string;
  sourcePath: string;
  confidence?: number;
};

export interface DeterministicVariableEntry {
  id: string;
  name: string;
  definition?: string;
  default?: number | string | boolean | null;
  constraints?: string[];
}

export interface DeterministicMappingResult {
  meta: {
    sourceName?: string;
    sourceVersion?: string;
    domain?: string;
    generatedAt?: string;
  };
  metrics: Record<string, number>;
  symbolDictionary: DeterministicSymbolEntry[];
  variableModel: {
    variables: DeterministicVariableEntry[];
  };
  ruleCatalog: DeterministicRuleCatalogEntry[];
  runtimeRuleCards: DeterministicRuntimeRuleCard[];
  stateModel?: unknown;
  pipelineHints: {
    parallelTasks: Array<Record<string, unknown>>;
  };
  packSummary?: string;
  resourceManifest: Array<{ id: string; type: string; path: string }>;
  semanticArtifacts: Record<string, unknown>;
  promptAssets?: LlmPromptAssets;
  warnings: string[];
  reviewQueue: Array<{ id: string; reason: string; detail?: string }>;
  extensions: {
    sourceRaw?: unknown;
    traceMap?: TraceEntry[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item) => typeof item === "string") as string[];
  return out.length ? out : undefined;
}

function normalizeDomain(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return normalized;
}

function normalizeRuleType(value: unknown): DeterministicRuleType {
  if (typeof value !== "string") return "UNKNOWN";
  const upper = value.trim().toUpperCase();
  if (upper === "CONSTRAINT" || upper === "BONUS" || upper === "RISK" || upper === "REALITY") {
    return upper;
  }
  return "UNKNOWN";
}

function suffixId(value: string): string | null {
  const match = /(\d+)$/.exec(value);
  return match ? match[1] : null;
}

function indexRuleDeck(markdownAssets: ParsedMarkdownAsset[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const asset of markdownAssets) {
    if (!asset.relPath.includes("02_rule_deck.md")) continue;
    for (const block of asset.jsonBlocks) {
      if (!block.parsed || !isRecord(block.parsed)) continue;
      const id = block.parsed.id;
      if (typeof id === "string") {
        map.set(id, block.parsed);
      }
    }
  }
  return map;
}

function mergeSemanticArtifacts(markdownAssets: ParsedMarkdownAsset[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const asset of markdownAssets) {
    if (!asset.relPath.includes("03_outputs_O1_O5.md")) continue;
    for (const block of asset.jsonBlocks) {
      if (!block.parsed || !isRecord(block.parsed)) continue;
      Object.assign(merged, block.parsed);
    }
  }
  return merged;
}

function buildResourceManifest(outputs: Record<string, unknown> | undefined): Array<{ id: string; type: string; path: string }> {
  if (!outputs) return [];
  const manifest: Array<{ id: string; type: string; path: string }> = [];
  const addList = (key: string, type: string) => {
    const value = outputs[key];
    if (!Array.isArray(value)) return;
    for (const entry of value) {
      if (typeof entry !== "string") continue;
      manifest.push({
        id: `${type}-${manifest.length + 1}`,
        type,
        path: entry,
      });
    }
  };
  addList("visualizations", "chart");
  addList("logs", "log");
  addList("data_files", "data");
  return manifest;
}

function buildPromptAssets(markdownAssets: ParsedMarkdownAsset[]): LlmPromptAssets | undefined {
  const asset = markdownAssets.find((entry) => entry.relPath.includes("game-engine-generator-prompt"));
  if (!asset) return undefined;

  const sections = asset.sections ?? [];
  let constraints: string | undefined;
  let examples: string | undefined;
  const bodyParts: string[] = [];

  for (const section of sections) {
    const heading = section.heading.trim();
    const content = section.content?.trim();
    if (!content) continue;

    if (heading.includes("语言约束")) {
      constraints = content;
      continue;
    }
    if (heading.includes("示例转换")) {
      examples = content;
      continue;
    }
    if (section.level === 1 && /提示/.test(heading)) {
      continue;
    }

    bodyParts.push(`## ${heading}\n\n${content}`);
  }

  const systemPrompt = bodyParts.length ? bodyParts.join("\n\n").trim() : asset.rawText.trim();
  if (!systemPrompt) return undefined;

  return {
    systemPrompt,
    constraints,
    examples,
    rawBlocks: [],
  };
}

function findMarkdownPath(markdownAssets: ParsedMarkdownAsset[], hint: string): string {
  return markdownAssets.find((asset) => asset.relPath.includes(hint))?.relPath ?? hint;
}

function buildTraceMap(pack: NormalizedEnginePack): TraceEntry[] {
  const entries: TraceEntry[] = [];
  const enginePath = pack.primaryEngineJson?.relPath ?? "symbol_engine.json";

  entries.push({ targetPath: "meta", sourcePath: `${enginePath}#engine_config` });
  entries.push({ targetPath: "metrics", sourcePath: `${enginePath}#metadata` });
  entries.push({ targetPath: "symbolDictionary", sourcePath: `${enginePath}#symbol_table.symbols` });
  entries.push({ targetPath: "variableModel.variables", sourcePath: `${enginePath}#symbol_table.variables` });
  entries.push({ targetPath: "ruleCatalog", sourcePath: `${enginePath}#symbol_table.rules` });
  entries.push({ targetPath: "runtimeRuleCards", sourcePath: `${enginePath}#rules` });
  entries.push({ targetPath: "stateModel", sourcePath: `${enginePath}#state` });
  entries.push({ targetPath: "pipelineHints.parallelTasks", sourcePath: `${enginePath}#tasks.parallel_tasks` });
  entries.push({ targetPath: "packSummary", sourcePath: `${enginePath}#outputs.summary` });
  entries.push({ targetPath: "resourceManifest", sourcePath: `${enginePath}#outputs` });
  entries.push({
    targetPath: "semanticArtifacts",
    sourcePath: findMarkdownPath(pack.markdownAssets, "03_outputs_O1_O5.md"),
  });
  entries.push({
    targetPath: "promptAssets",
    sourcePath: findMarkdownPath(pack.markdownAssets, "game-engine-generator-prompt.md"),
  });
  entries.push({
    targetPath: "extensions.sourceRaw",
    sourcePath: enginePath,
  });

  return entries;
}

export function mapDeterministically(pack: NormalizedEnginePack): DeterministicMappingResult {
  const warnings: string[] = [];
  const reviewQueue: Array<{ id: string; reason: string; detail?: string }> = [];
  const primary = pack.primaryEngineJson?.data;
  const engineConfig = isRecord(primary) && isRecord(primary.engine_config) ? primary.engine_config : undefined;
  const metadata = isRecord(primary) && isRecord(primary.metadata) ? primary.metadata : undefined;
  const symbolTable = isRecord(primary) && isRecord(primary.symbol_table) ? primary.symbol_table : undefined;
  const outputs = isRecord(primary) && isRecord(primary.outputs) ? primary.outputs : undefined;
  const tasks = isRecord(primary) && isRecord(primary.tasks) ? primary.tasks : undefined;

  const symbolDictionary: DeterministicSymbolEntry[] = [];
  const variables: DeterministicVariableEntry[] = [];
  const ruleCatalog: DeterministicRuleCatalogEntry[] = [];
  const runtimeRuleCards: DeterministicRuntimeRuleCard[] = [];

  if (symbolTable) {
    const symbols = Array.isArray(symbolTable.symbols) ? symbolTable.symbols : [];
    for (const entry of symbols) {
      if (!isRecord(entry)) continue;
      const id = typeof entry.id === "string" ? entry.id : typeof entry.name === "string" ? entry.name : "unknown-symbol";
      symbolDictionary.push({
        id,
        label: typeof entry.name === "string" ? entry.name : id,
        definition: typeof entry.definition === "string" ? entry.definition : undefined,
        constraints: toStringArray(entry.constraints),
        kind: typeof entry.type === "string" ? entry.type : undefined,
      });
    }

    const vars = Array.isArray(symbolTable.variables) ? symbolTable.variables : [];
    for (const entry of vars) {
      if (!isRecord(entry)) continue;
      const id = typeof entry.name === "string" ? entry.name : "unknown-variable";
      variables.push({
        id,
        name: typeof entry.name === "string" ? entry.name : id,
        definition: typeof entry.definition === "string" ? entry.definition : undefined,
        default: entry.default as DeterministicVariableEntry["default"],
        constraints: toStringArray(entry.constraints),
      });
    }
  }

  const ruleDeck = indexRuleDeck(pack.markdownAssets);
  const propositions = symbolTable && Array.isArray(symbolTable.rules) ? symbolTable.rules : [];
  for (const entry of propositions) {
    if (!isRecord(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : typeof entry.name === "string" ? entry.name : "unknown-prop";
    const catalogEntry: DeterministicRuleCatalogEntry = {
      id,
      name: typeof entry.name === "string" ? entry.name : id,
      definition: typeof entry.definition === "string" ? entry.definition : undefined,
      constraints: toStringArray(entry.constraints),
    };
    if (ruleDeck.has(id)) {
      catalogEntry.advanced = ruleDeck.get(id);
    }
    ruleCatalog.push(catalogEntry);
  }

  const execRules = isRecord(primary) && Array.isArray(primary.rules) ? primary.rules : [];
  const execBySuffix = new Map<string, Record<string, unknown>>();
  for (const rule of execRules) {
    if (!isRecord(rule)) continue;
    const id = typeof rule.id === "string" ? rule.id : undefined;
    if (!id) continue;
    const suffix = suffixId(id);
    if (suffix) execBySuffix.set(suffix, rule);
  }

  for (const prop of ruleCatalog) {
    const suffix = suffixId(prop.id);
    if (!suffix) {
      reviewQueue.push({ id: prop.id, reason: "missing id suffix" });
      continue;
    }
    const exec = execBySuffix.get(suffix);
    if (!exec) {
      reviewQueue.push({ id: prop.id, reason: "missing execution rule" });
      warnings.push(`No execution rule found for proposition ${prop.id}`);
      continue;
    }
    const ruleId = typeof exec.id === "string" ? exec.id : `rule_${suffix}`;
    runtimeRuleCards.push({
      id: `${prop.id}-${ruleId}`,
      propositionId: prop.id,
      ruleId,
      title: prop.name,
      condition: typeof exec.condition === "string" ? exec.condition : "",
      action: typeof exec.action === "string" ? exec.action : "",
      priority: typeof exec.priority === "number" ? exec.priority : null,
      type: normalizeRuleType((prop.advanced ?? {}).type),
    });
  }

  const parallelTasks = tasks && Array.isArray(tasks.parallel_tasks) ? tasks.parallel_tasks : [];

  const metrics: Record<string, number> = {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === "number") metrics[key] = value;
    }
  }

  const semanticArtifacts = mergeSemanticArtifacts(pack.markdownAssets);
  const promptAssets = buildPromptAssets(pack.markdownAssets);

  return {
    meta: {
      sourceName: typeof engineConfig?.name === "string" ? engineConfig.name : undefined,
      sourceVersion: typeof engineConfig?.version === "string" ? engineConfig.version : undefined,
      domain: normalizeDomain(engineConfig?.domain),
      generatedAt: typeof engineConfig?.generated_at === "string" ? engineConfig.generated_at : undefined,
    },
    metrics,
    symbolDictionary,
    variableModel: { variables },
    ruleCatalog,
    runtimeRuleCards,
    stateModel: isRecord(primary) ? primary.state : undefined,
    pipelineHints: { parallelTasks: parallelTasks.filter(isRecord) as Array<Record<string, unknown>> },
    packSummary: typeof outputs?.summary === "string" ? outputs.summary : undefined,
    resourceManifest: buildResourceManifest(outputs),
    semanticArtifacts,
    promptAssets,
    warnings,
    reviewQueue,
    extensions: {
      sourceRaw: primary,
      traceMap: buildTraceMap(pack),
    },
  };
}
