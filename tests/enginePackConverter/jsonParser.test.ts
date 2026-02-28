import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseJsonFile } from "../../services/enginePackConverter/parser/jsonParser";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cc-json-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("parseJsonFile", () => {
  it("parses valid JSON", async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, "valid.json");
      await fs.writeFile(filePath, "{\"value\": 42}", "utf8");

      const result = await parseJsonFile<{ value: number }>(filePath, dir);
      expect(result.data).toEqual({ value: 42 });
      expect(result.error).toBeUndefined();
      expect(result.relPath).toBe("valid.json");
    });
  });

  it("captures JSON parse errors", async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, "invalid.json");
      await fs.writeFile(filePath, "{invalid}", "utf8");

      const result = await parseJsonFile(filePath, dir);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });
});
