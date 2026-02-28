import path from "path";
import { parseJsonFile } from "./parser/jsonParser.js";
import { parseMarkdownFile } from "./parser/markdownParser.js";
import { promises as fs } from "fs";
function isJsonAsset(assetPath) {
    return path.extname(assetPath).toLowerCase() === ".json";
}
function isMarkdownAsset(assetPath) {
    const ext = path.extname(assetPath).toLowerCase();
    return ext === ".md" || ext === ".markdown";
}
async function parseTextAsset(assetPath, root) {
    const content = await fs.readFile(assetPath, "utf8");
    const ext = path.extname(assetPath).toLowerCase();
    const kind = ext === ".mmd" ? "mermaid" : ext === ".txt" ? "text" : "other";
    return {
        path: assetPath,
        relPath: path.relative(root, assetPath),
        kind,
        content,
    };
}
function pickPrimaryEngineJson(jsonAssets) {
    return jsonAssets.find((asset) => /symbol_engine.*\.json$/i.test(asset.relPath));
}
function resolveEngineConfig(primary) {
    if (!primary || !primary.data || typeof primary.data !== "object")
        return undefined;
    return primary.data.engine_config;
}
function resolveSourceSchema(primary) {
    if (!primary || !primary.data || typeof primary.data !== "object")
        return undefined;
    const schema = primary.data["$schema"];
    return typeof schema === "string" ? schema : undefined;
}
export async function normalizePackage(pkg) {
    const jsonAssets = [];
    const markdownAssets = [];
    const textAssets = [];
    const warnings = [];
    for (const asset of pkg.assets) {
        try {
            if (isJsonAsset(asset.path)) {
                jsonAssets.push(await parseJsonFile(asset.path, pkg.root));
                continue;
            }
            if (isMarkdownAsset(asset.path)) {
                const parsed = await parseMarkdownFile(asset.path, pkg.root);
                markdownAssets.push(parsed);
                if (parsed.warnings.length)
                    warnings.push(...parsed.warnings);
                continue;
            }
            if (asset.kind === "text" || asset.kind === "mermaid" || asset.kind === "other") {
                textAssets.push(await parseTextAsset(asset.path, pkg.root));
            }
        }
        catch (err) {
            warnings.push(`Failed to parse ${asset.relPath}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    const primaryEngineJson = pickPrimaryEngineJson(jsonAssets) ?? jsonAssets[0];
    return {
        root: pkg.root,
        createdAt: pkg.createdAt,
        normalizedAt: new Date().toISOString(),
        assets: pkg.assets,
        jsonAssets,
        markdownAssets,
        textAssets,
        warnings,
        primaryEngineJson,
        engineConfig: resolveEngineConfig(primaryEngineJson),
        sourceSchema: resolveSourceSchema(primaryEngineJson),
    };
}
