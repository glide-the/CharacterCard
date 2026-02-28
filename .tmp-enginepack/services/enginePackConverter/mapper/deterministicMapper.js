function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toStringArray(value) {
    if (!Array.isArray(value))
        return undefined;
    const out = value.filter((item) => typeof item === "string");
    return out.length ? out : undefined;
}
function normalizeDomain(value) {
    if (typeof value !== "string")
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return undefined;
    return normalized;
}
function normalizeRuleType(value) {
    if (typeof value !== "string")
        return "UNKNOWN";
    const upper = value.trim().toUpperCase();
    if (upper === "CONSTRAINT" || upper === "BONUS" || upper === "RISK" || upper === "REALITY") {
        return upper;
    }
    return "UNKNOWN";
}
function suffixId(value) {
    const match = /(\d+)$/.exec(value);
    return match ? match[1] : null;
}
function indexRuleDeck(markdownAssets) {
    const map = new Map();
    for (const asset of markdownAssets) {
        if (!asset.relPath.includes("02_rule_deck.md"))
            continue;
        for (const block of asset.jsonBlocks) {
            if (!block.parsed || !isRecord(block.parsed))
                continue;
            const id = block.parsed.id;
            if (typeof id === "string") {
                map.set(id, block.parsed);
            }
        }
    }
    return map;
}
function mergeSemanticArtifacts(markdownAssets) {
    const merged = {};
    for (const asset of markdownAssets) {
        if (!asset.relPath.includes("03_outputs_O1_O5.md"))
            continue;
        for (const block of asset.jsonBlocks) {
            if (!block.parsed || !isRecord(block.parsed))
                continue;
            Object.assign(merged, block.parsed);
        }
    }
    return merged;
}
function buildResourceManifest(outputs) {
    if (!outputs)
        return [];
    const manifest = [];
    const addList = (key, type) => {
        const value = outputs[key];
        if (!Array.isArray(value))
            return;
        for (const entry of value) {
            if (typeof entry !== "string")
                continue;
            manifest.push({
                id: `${type}-${manifest.length + 1}`,
                type,
                path: entry,
            });
        }
    };
    addList("visualizations", "chart");
    addList("logs", "log");
    addList("data_files", "data");
    return manifest;
}
export function mapDeterministically(pack) {
    const warnings = [];
    const reviewQueue = [];
    const primary = pack.primaryEngineJson?.data;
    const engineConfig = isRecord(primary) && isRecord(primary.engine_config) ? primary.engine_config : undefined;
    const metadata = isRecord(primary) && isRecord(primary.metadata) ? primary.metadata : undefined;
    const symbolTable = isRecord(primary) && isRecord(primary.symbol_table) ? primary.symbol_table : undefined;
    const outputs = isRecord(primary) && isRecord(primary.outputs) ? primary.outputs : undefined;
    const tasks = isRecord(primary) && isRecord(primary.tasks) ? primary.tasks : undefined;
    const symbolDictionary = [];
    const variables = [];
    const ruleCatalog = [];
    const runtimeRuleCards = [];
    if (symbolTable) {
        const symbols = Array.isArray(symbolTable.symbols) ? symbolTable.symbols : [];
        for (const entry of symbols) {
            if (!isRecord(entry))
                continue;
            const id = typeof entry.id === "string" ? entry.id : typeof entry.name === "string" ? entry.name : "unknown-symbol";
            symbolDictionary.push({
                id,
                label: typeof entry.name === "string" ? entry.name : id,
                definition: typeof entry.definition === "string" ? entry.definition : undefined,
                constraints: toStringArray(entry.constraints),
                kind: typeof entry.type === "string" ? entry.type : undefined,
            });
        }
        const vars = Array.isArray(symbolTable.variables) ? symbolTable.variables : [];
        for (const entry of vars) {
            if (!isRecord(entry))
                continue;
            const id = typeof entry.name === "string" ? entry.name : "unknown-variable";
            variables.push({
                id,
                name: typeof entry.name === "string" ? entry.name : id,
                definition: typeof entry.definition === "string" ? entry.definition : undefined,
                default: entry.default,
                constraints: toStringArray(entry.constraints),
            });
        }
    }
    const ruleDeck = indexRuleDeck(pack.markdownAssets);
    const propositions = symbolTable && Array.isArray(symbolTable.rules) ? symbolTable.rules : [];
    for (const entry of propositions) {
        if (!isRecord(entry))
            continue;
        const id = typeof entry.id === "string" ? entry.id : typeof entry.name === "string" ? entry.name : "unknown-prop";
        const catalogEntry = {
            id,
            name: typeof entry.name === "string" ? entry.name : id,
            definition: typeof entry.definition === "string" ? entry.definition : undefined,
            constraints: toStringArray(entry.constraints),
        };
        if (ruleDeck.has(id)) {
            catalogEntry.advanced = ruleDeck.get(id);
        }
        ruleCatalog.push(catalogEntry);
    }
    const execRules = isRecord(primary) && Array.isArray(primary.rules) ? primary.rules : [];
    const execBySuffix = new Map();
    for (const rule of execRules) {
        if (!isRecord(rule))
            continue;
        const id = typeof rule.id === "string" ? rule.id : undefined;
        if (!id)
            continue;
        const suffix = suffixId(id);
        if (suffix)
            execBySuffix.set(suffix, rule);
    }
    for (const prop of ruleCatalog) {
        const suffix = suffixId(prop.id);
        if (!suffix) {
            reviewQueue.push({ id: prop.id, reason: "missing id suffix" });
            continue;
        }
        const exec = execBySuffix.get(suffix);
        if (!exec) {
            reviewQueue.push({ id: prop.id, reason: "missing execution rule" });
            warnings.push(`No execution rule found for proposition ${prop.id}`);
            continue;
        }
        const ruleId = typeof exec.id === "string" ? exec.id : `rule_${suffix}`;
        runtimeRuleCards.push({
            id: `${prop.id}-${ruleId}`,
            propositionId: prop.id,
            ruleId,
            title: prop.name,
            condition: typeof exec.condition === "string" ? exec.condition : "",
            action: typeof exec.action === "string" ? exec.action : "",
            priority: typeof exec.priority === "number" ? exec.priority : null,
            type: normalizeRuleType((prop.advanced ?? {}).type),
        });
    }
    const parallelTasks = tasks && Array.isArray(tasks.parallel_tasks) ? tasks.parallel_tasks : [];
    const metrics = {};
    if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === "number")
                metrics[key] = value;
        }
    }
    const semanticArtifacts = mergeSemanticArtifacts(pack.markdownAssets);
    return {
        meta: {
            sourceName: typeof engineConfig?.name === "string" ? engineConfig.name : undefined,
            sourceVersion: typeof engineConfig?.version === "string" ? engineConfig.version : undefined,
            domain: normalizeDomain(engineConfig?.domain),
            generatedAt: typeof engineConfig?.generated_at === "string" ? engineConfig.generated_at : undefined,
        },
        metrics,
        symbolDictionary,
        variableModel: { variables },
        ruleCatalog,
        runtimeRuleCards,
        stateModel: isRecord(primary) ? primary.state : undefined,
        pipelineHints: { parallelTasks: parallelTasks.filter(isRecord) },
        packSummary: typeof outputs?.summary === "string" ? outputs.summary : undefined,
        resourceManifest: buildResourceManifest(outputs),
        semanticArtifacts,
        warnings,
        reviewQueue,
        extensions: {
            sourceRaw: primary,
        },
    };
}
