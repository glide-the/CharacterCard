import path from "path";
import { promises as fs } from "fs";
import type { TaskAIConfig } from "../../types";
import type { AIProviderConfig } from "../aiEngine";
import { collectPackageAssets } from "./collector";
import { normalizePackage } from "./normalizer";
import { mapDeterministically } from "./mapper/deterministicMapper";
import { mapWithLlmProtocol } from "./mapper/llmProtocolMapper";
import { buildEvaluationPack, validateEvaluationPack } from "./validator";

export interface ConvertOptions {
  packageRoot: string;
  outputFile: string;
  reviewQueueFile?: string;
  reportFile?: string;
  targetSchemaVersion: "evaluation-pack.v1";
  useLLM?: boolean;
  aiConfig?: AIProviderConfig;
  taskConfig?: TaskAIConfig;
  checkFiles?: boolean;
}

export interface ConversionResult {
  outputPath: string;
  reviewQueuePath?: string;
  reportPath?: string;
  warnings: string[];
  reviewRequired: boolean;
  validation: {
    ok: boolean;
    errorCount: number;
    warningCount: number;
    reviewCount: number;
    stats: {
      symbolCount: number;
      variableCount: number;
      ruleCount: number;
      runtimeRuleCount: number;
    };
  };
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await ensureDir(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeReport(filePath: string, content: string): Promise<void> {
  await ensureDir(filePath);
  await fs.writeFile(filePath, content, "utf8");
}

function buildReportMarkdown(options: ConvertOptions, warnings: string[], validation: Awaited<ReturnType<typeof validateEvaluationPack>>): string {
  const lines: string[] = [];
  lines.push("# Engine Pack Conversion Report");
  lines.push("");
  lines.push(`- Timestamp: ${new Date().toISOString()}`);
  lines.push(`- Package Root: ${options.packageRoot}`);
  lines.push(`- Target Schema: ${options.targetSchemaVersion}`);
  lines.push(`- LLM Enabled: ${options.useLLM ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Stats");
  lines.push("");
  lines.push(`- Symbols: ${validation.stats.symbolCount}`);
  lines.push(`- Variables: ${validation.stats.variableCount}`);
  lines.push(`- Rules: ${validation.stats.ruleCount}`);
  lines.push(`- Runtime Rules: ${validation.stats.runtimeRuleCount}`);
  lines.push(`- Review Items: ${validation.stats.reviewCount}`);
  lines.push("");
  lines.push("## Validation Summary");
  lines.push("");
  lines.push(`- OK: ${validation.ok ? "yes" : "no"}`);
  lines.push(`- Errors: ${validation.errors.length}`);
  lines.push(`- Warnings: ${validation.warnings.length}`);
  lines.push("");
  if (validation.errors.length) {
    lines.push("## Errors");
    lines.push("");
    for (const issue of validation.errors) {
      lines.push(`- ${issue.code}: ${issue.message}${issue.path ? ` (${issue.path})` : ""}`);
    }
    lines.push("");
  }
  if (validation.warnings.length) {
    lines.push("## Warnings");
    lines.push("");
    for (const issue of validation.warnings) {
      lines.push(`- ${issue.code}: ${issue.message}${issue.path ? ` (${issue.path})` : ""}`);
    }
    lines.push("");
  }
  if (warnings.length) {
    lines.push("## Conversion Warnings");
    lines.push("");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export async function convertGameEnginePackage(options: ConvertOptions): Promise<ConversionResult> {
  if (!options.packageRoot) {
    throw new Error("packageRoot is required");
  }
  if (!options.outputFile) {
    throw new Error("outputFile is required");
  }
  if (options.useLLM && (!options.aiConfig || !options.taskConfig)) {
    throw new Error("useLLM requires aiConfig and taskConfig");
  }

  const collected = await collectPackageAssets(options.packageRoot);
  const normalized = await normalizePackage(collected);
  const deterministic = mapDeterministically(normalized);
  const warnings: string[] = [...normalized.warnings, ...deterministic.warnings];

  const llm = options.useLLM && options.aiConfig && options.taskConfig
    ? await mapWithLlmProtocol(normalized, deterministic, options.aiConfig, options.taskConfig)
    : undefined;
  if (llm?.warnings?.length) warnings.push(...llm.warnings);

  const validation = await validateEvaluationPack(deterministic, llm, {
    packageRoot: options.packageRoot,
    checkFiles: options.checkFiles ?? true,
  });

  const pack = buildEvaluationPack(deterministic, llm);
  await writeJson(options.outputFile, pack);

  if (options.reviewQueueFile) {
    await writeJson(options.reviewQueueFile, validation.reviewQueue);
  }

  if (options.reportFile) {
    await writeReport(options.reportFile, buildReportMarkdown(options, warnings, validation));
  }

  return {
    outputPath: options.outputFile,
    reviewQueuePath: options.reviewQueueFile,
    reportPath: options.reportFile,
    warnings,
    reviewRequired: !validation.ok || validation.reviewQueue.length > 0,
    validation: {
      ok: validation.ok,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      reviewCount: validation.reviewQueue.length,
      stats: {
        symbolCount: validation.stats.symbolCount,
        variableCount: validation.stats.variableCount,
        ruleCount: validation.stats.ruleCount,
        runtimeRuleCount: validation.stats.runtimeRuleCount,
      },
    },
  };
}
