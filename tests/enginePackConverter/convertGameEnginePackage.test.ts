import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { convertGameEnginePackage } from "../../services/enginePackConverter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cc-convert-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("convertGameEnginePackage", () => {
  it("converts the sample package without LLM", async () => {
    await withTempDir(async (dir) => {
      const packageRoot = path.resolve(__dirname, "../../docs/game-engine-package");
      const outputFile = path.join(dir, "evaluation-pack.v1.json");
      const reviewQueueFile = path.join(dir, "review-queue.json");
      const reportFile = path.join(dir, "conversion-report.md");

      const result = await convertGameEnginePackage({
        packageRoot,
        outputFile,
        reviewQueueFile,
        reportFile,
        targetSchemaVersion: "evaluation-pack.v1",
        useLLM: false,
        checkFiles: false,
      });

      const raw = await fs.readFile(result.outputPath, "utf8");
      const pack = JSON.parse(raw) as { meta?: unknown; ruleCatalog?: unknown; promptAssets?: unknown };

      expect(result.validation.ok).toBeTypeOf("boolean");
      expect(result.validation.stats.ruleCount).toBeGreaterThan(0);
      expect(pack.meta).toBeTruthy();
      expect(pack.ruleCatalog).toBeTruthy();
      expect(pack.promptAssets).toBeTruthy();
    });
  });
});
