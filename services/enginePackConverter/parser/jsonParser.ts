import { promises as fs } from "fs";
import path from "path";
import type { ParsedJsonAsset } from "../types";

export async function parseJsonFile<T = unknown>(filePath: string, root?: string): Promise<ParsedJsonAsset<T>> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw) as T;
    return {
      path: filePath,
      relPath: root ? path.relative(root, filePath) : filePath,
      data,
    };
  } catch (err) {
    return {
      path: filePath,
      relPath: root ? path.relative(root, filePath) : filePath,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
