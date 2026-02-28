export type AssetKind = "json" | "markdown" | "mermaid" | "text" | "other";

export interface CollectedAsset {
  path: string;
  relPath: string;
  ext: string;
  kind: AssetKind;
  size: number;
  mtimeMs: number;
  hash: string;
}

export interface CollectedPackage {
  root: string;
  assets: CollectedAsset[];
  createdAt: string;
}

export interface ParsedJsonAsset<T = unknown> {
  path: string;
  relPath: string;
  data: T | null;
  error?: string;
}

export interface MarkdownSection {
  heading: string;
  level: number;
  startLine: number;
  endLine: number;
  content: string;
}

export interface MarkdownJsonBlock {
  startLine: number;
  endLine: number;
  lang: string;
  raw: string;
  parsed?: unknown;
  error?: string;
}

export interface ParsedMarkdownAsset {
  path: string;
  relPath: string;
  sections: MarkdownSection[];
  jsonBlocks: MarkdownJsonBlock[];
  rawText: string;
  warnings: string[];
}

export interface ParsedTextAsset {
  path: string;
  relPath: string;
  kind: Exclude<AssetKind, "json" | "markdown">;
  content: string;
}

export interface NormalizedEnginePack {
  root: string;
  createdAt: string;
  normalizedAt: string;
  assets: CollectedAsset[];
  jsonAssets: ParsedJsonAsset[];
  markdownAssets: ParsedMarkdownAsset[];
  textAssets: ParsedTextAsset[];
  warnings: string[];
  primaryEngineJson?: ParsedJsonAsset;
  engineConfig?: unknown;
  sourceSchema?: string;
}
