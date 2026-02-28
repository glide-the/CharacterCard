import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { convertGameEnginePackage } from "../../services/enginePackConverter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cc-golden-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => normalize(item));
    if (normalized.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))) {
      return [...normalized].sort((a, b) => String(a).localeCompare(String(b)));
    }
    const keyed = normalized.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const obj = item as Record<string, unknown>;
        const key =
          (typeof obj.id === "string" && obj.id) ||
          (typeof obj.name === "string" && obj.name) ||
          (typeof obj.label === "string" && obj.label) ||
          (typeof obj.path === "string" && obj.path) ||
          (typeof obj.type === "string" && obj.type);
        return { key, value: item };
      }
      return { key: undefined, value: item };
    });
    const sortable = keyed.every((entry) => typeof entry.key === "string");
    if (sortable) {
      return keyed
        .sort((a, b) => String(a.key).localeCompare(String(b.key)))
        .map((entry) => entry.value);
    }
    return [...normalized].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.keys(obj)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [key, normalize(obj[key])] as const);
    return Object.fromEntries(entries);
  }

  return value;
}

describe("engine pack regression (golden diff)", () => {
  it("matches the committed evaluation-pack.v1.json for the sample package", async () => {
    await withTempDir(async (dir) => {
      const packageRoot = path.resolve(__dirname, "../../docs/game-engine-package");
      const outputFile = path.join(dir, "evaluation-pack.v1.json");

      await convertGameEnginePackage({
        packageRoot,
        outputFile,
        targetSchemaVersion: "evaluation-pack.v1",
        useLLM: false,
        checkFiles: false,
      });

      const goldenPath = path.resolve(__dirname, "../../public/engine-pack/evaluation-pack.v1.json");
      const [goldenRaw, actualRaw] = await Promise.all([
        fs.readFile(goldenPath, "utf8"),
        fs.readFile(outputFile, "utf8"),
      ]);

      const golden = normalize(JSON.parse(goldenRaw));
      const actual = normalize(JSON.parse(actualRaw));

      expect(actual).toEqual(golden);
    });
  });
});
