import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseMarkdownFile } from "../../services/enginePackConverter/parser/markdownParser";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cc-md-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("parseMarkdownFile", () => {
  it("extracts sections and JSON blocks", async () => {
    await withTempDir(async (dir) => {
      const filePath = path.join(dir, "sample.md");
      const content = [
        "# Title",
        "Intro text.",
        "",
        "## Data",
        "```json",
        "{\"foo\": \"bar\"}",
        "```",
        "",
        "### Broken",
        "```json",
        "{broken}",
        "```",
      ].join("\n");
      await fs.writeFile(filePath, content, "utf8");

      const result = await parseMarkdownFile(filePath, dir);
      expect(result.sections.length).toBeGreaterThan(1);
      expect(result.jsonBlocks.length).toBe(2);
      expect(result.jsonBlocks[0].parsed).toEqual({ foo: "bar" });
      expect(result.warnings.length).toBe(1);
      expect(result.relPath).toBe("sample.md");
    });
  });
});
