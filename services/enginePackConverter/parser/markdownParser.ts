import { promises as fs } from "fs";
import path from "path";
import type { MarkdownJsonBlock, MarkdownSection, ParsedMarkdownAsset } from "../types";

function finalizeSection(sections: MarkdownSection[], current: MarkdownSection | null, endLine: number, buffer: string[]): void {
  if (!current) return;
  current.endLine = endLine;
  current.content = buffer.join("\n").trimEnd();
  sections.push(current);
}

export async function parseMarkdownFile(filePath: string, root?: string): Promise<ParsedMarkdownAsset> {
  const rawText = await fs.readFile(filePath, "utf8");
  const lines = rawText.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  const jsonBlocks: MarkdownJsonBlock[] = [];
  const warnings: string[] = [];

  let currentSection: MarkdownSection | null = null;
  let sectionBuffer: string[] = [];

  let inCodeBlock = false;
  let codeLang = "";
  let codeStart = 0;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim().toLowerCase();
        codeStart = lineNo;
        codeBuffer = [];
        if (currentSection) {
          sectionBuffer.push(line);
        }
      } else {
        const raw = codeBuffer.join("\n");
        const block: MarkdownJsonBlock = {
          startLine: codeStart,
          endLine: lineNo,
          lang: codeLang || "",
          raw,
        };
        if (codeLang.includes("json")) {
          try {
            block.parsed = JSON.parse(raw);
          } catch (err) {
            block.error = err instanceof Error ? err.message : String(err);
            warnings.push(`JSON parse error in ${path.basename(filePath)}:${codeStart}-${lineNo}`);
          }
        }
        jsonBlocks.push(block);
        inCodeBlock = false;
        codeLang = "";
        codeStart = 0;
        codeBuffer = [];
        if (currentSection) {
          sectionBuffer.push(line);
        }
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      if (currentSection) {
        sectionBuffer.push(line);
      }
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      finalizeSection(sections, currentSection, lineNo - 1, sectionBuffer);
      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        startLine: lineNo,
        endLine: lineNo,
        content: "",
      };
      sectionBuffer = [];
      continue;
    }

    if (currentSection) {
      sectionBuffer.push(line);
    }
  }

  finalizeSection(sections, currentSection, lines.length, sectionBuffer);

  if (inCodeBlock) {
    warnings.push(`Unclosed code block starting at line ${codeStart} in ${path.basename(filePath)}`);
  }

  return {
    path: filePath,
    relPath: root ? path.relative(root, filePath) : filePath,
    sections,
    jsonBlocks,
    rawText,
    warnings,
  };
}
