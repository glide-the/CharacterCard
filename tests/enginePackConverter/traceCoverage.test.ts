import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { convertGameEnginePackage } from "../../services/enginePackConverter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type TraceEntry = { targetPath?: string; sourcePath?: string };

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cc-trace-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== undefined && value !== null && value !== "";
}

describe("evaluation-pack trace coverage", () => {
  it("persists a trace map for populated top-level fields", async () => {
    await withTempDir(async (dir) => {
      const packageRoot = path.resolve(__dirname, "../../docs/game-engine-package");
      const outputFile = path.join(dir, "evaluation-pack.v1.json");

      const result = await convertGameEnginePackage({
        packageRoot,
        outputFile,
        targetSchemaVersion: "evaluation-pack.v1",
        useLLM: false,
        checkFiles: false,
      });

      const raw = await fs.readFile(result.outputPath, "utf8");
      const pack = JSON.parse(raw) as Record<string, unknown>;
      const traceMap = (pack.extensions as { traceMap?: TraceEntry[] } | undefined)?.traceMap ?? [];
      const targets = new Set(traceMap.map((entry) => entry.targetPath).filter(Boolean) as string[]);

      expect(traceMap.length).toBeGreaterThan(0);
      for (const entry of traceMap) {
        expect(entry.sourcePath).toBeTypeOf("string");
      }

      const checks: Array<{ path: string; value: unknown }> = [
        { path: "meta", value: pack.meta },
        { path: "metrics", value: pack.metrics },
        { path: "symbolDictionary", value: pack.symbolDictionary },
        { path: "variableModel.variables", value: (pack.variableModel as Record<string, unknown>)?.variables },
        { path: "ruleCatalog", value: pack.ruleCatalog },
        { path: "runtimeRuleCards", value: pack.runtimeRuleCards },
        { path: "stateModel", value: pack.stateModel },
        { path: "pipelineHints.parallelTasks", value: (pack.pipelineHints as Record<string, unknown>)?.parallelTasks },
        { path: "packSummary", value: pack.packSummary },
        { path: "resourceManifest", value: pack.resourceManifest },
        { path: "semanticArtifacts", value: pack.semanticArtifacts },
        { path: "promptAssets", value: pack.promptAssets },
      ];

      for (const check of checks) {
        if (!hasValue(check.value)) continue;
        expect(targets.has(check.path)).toBe(true);
      }
    });
  });
});
