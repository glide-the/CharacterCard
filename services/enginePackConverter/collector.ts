import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { AssetKind, CollectedAsset, CollectedPackage } from "./types";

const DEFAULT_IGNORES = new Set(["node_modules", ".git", ".DS_Store"]);

function classifyKind(ext: string): AssetKind {
  switch (ext.toLowerCase()) {
    case ".json":
      return "json";
    case ".md":
    case ".markdown":
      return "markdown";
    case ".mmd":
      return "mermaid";
    case ".txt":
      return "text";
    default:
      return "other";
  }
}

async function hashFile(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

async function walkDir(root: string, dir: string, assets: CollectedAsset[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (DEFAULT_IGNORES.has(entry.name)) continue;
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(root, absPath, assets);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = await fs.stat(absPath);
    const ext = path.extname(entry.name);
    const kind = classifyKind(ext);
    const relPath = path.relative(root, absPath);
    const hash = await hashFile(absPath);
    assets.push({
      path: absPath,
      relPath,
      ext,
      kind,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      hash,
    });
  }
}

export async function collectPackageAssets(packageRoot: string): Promise<CollectedPackage> {
  const assets: CollectedAsset[] = [];
  await walkDir(packageRoot, packageRoot, assets);
  assets.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return {
    root: packageRoot,
    assets,
    createdAt: new Date().toISOString(),
  };
}
