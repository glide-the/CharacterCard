import { promises as fs } from "fs";
import path from "path";
const DOMAIN_ALLOWLIST = new Set(["narrative", "decision", "evaluation", "simulation", "unknown"]);
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
function normalizePath(filePath, packageRoot) {
    if (path.isAbsolute(filePath))
        return filePath;
    if (!packageRoot)
        return filePath;
    return path.join(packageRoot, filePath);
}
function uniqueIds(ids) {
    const seen = new Set();
    const duplicates = [];
    let missing = 0;
    for (const id of ids) {
        if (!id) {
            missing += 1;
            continue;
        }
        if (seen.has(id))
            duplicates.push(id);
        else
            seen.add(id);
    }
    return { duplicates, missing };
}
function mergeReviewQueue(...queues) {
    const combined = [];
    for (const queue of queues) {
        if (!queue)
            continue;
        for (const item of queue)
            combined.push(item);
    }
    return combined;
}
export function buildEvaluationPack(deterministic, llm) {
    const runtimeRuleCards = deterministic.runtimeRuleCards.map((card) => {
        const override = llm?.ruleTypeOverrides?.[card.propositionId];
        return override ? { ...card, type: override } : card;
    });
    return {
        meta: deterministic.meta,
        metrics: deterministic.metrics,
        symbolDictionary: deterministic.symbolDictionary,
        variableModel: {
            ...deterministic.variableModel,
            weights: llm?.variableStatWeights,
        },
        ruleCatalog: deterministic.ruleCatalog,
        runtimeRuleCards,
        stateModel: deterministic.stateModel,
        pipelineHints: deterministic.pipelineHints,
        packSummary: deterministic.packSummary,
        resourceManifest: deterministic.resourceManifest,
        semanticArtifacts: deterministic.semanticArtifacts,
        promptAssets: llm?.promptAssets,
        warnings: [...deterministic.warnings, ...(llm?.warnings ?? [])],
        extensions: deterministic.extensions,
    };
}
export async function validateEvaluationPack(deterministic, llm, options = {}) {
    const pack = buildEvaluationPack(deterministic, llm);
    const errors = [];
    const warnings = [];
    const reviewQueue = mergeReviewQueue(deterministic.reviewQueue, llm?.reviewQueue);
    if (!pack.meta.sourceName) {
        errors.push({ code: "meta.sourceName", message: "sourceName is required", severity: "error", path: "meta.sourceName" });
    }
    if (!pack.meta.sourceVersion || !SEMVER_RE.test(pack.meta.sourceVersion)) {
        warnings.push({
            code: "meta.sourceVersion",
            message: "sourceVersion should be semantic version x.y.z",
            severity: "warning",
            path: "meta.sourceVersion",
            detail: String(pack.meta.sourceVersion ?? "missing"),
        });
    }
    if (pack.meta.domain && !DOMAIN_ALLOWLIST.has(pack.meta.domain)) {
        warnings.push({
            code: "meta.domain",
            message: "domain is not in allowlist",
            severity: "warning",
            path: "meta.domain",
            detail: pack.meta.domain,
        });
    }
    const symbolIds = pack.symbolDictionary.map((entry) => entry.id);
    const symbolUniq = uniqueIds(symbolIds);
    if (symbolUniq.missing > 0) {
        errors.push({
            code: "symbolDictionary.missingId",
            message: "symbolDictionary entries missing id",
            severity: "error",
            detail: `missing=${symbolUniq.missing}`,
        });
    }
    if (symbolUniq.duplicates.length) {
        errors.push({
            code: "symbolDictionary.duplicateId",
            message: "symbolDictionary has duplicate ids",
            severity: "error",
            detail: symbolUniq.duplicates.join(", "),
        });
    }
    const variableIds = pack.variableModel.variables.map((entry) => entry.id);
    const variableUniq = uniqueIds(variableIds);
    if (variableUniq.missing > 0) {
        warnings.push({
            code: "variableModel.missingId",
            message: "variable entries missing id",
            severity: "warning",
            detail: `missing=${variableUniq.missing}`,
        });
    }
    if (variableUniq.duplicates.length) {
        warnings.push({
            code: "variableModel.duplicateId",
            message: "variable entries duplicate ids",
            severity: "warning",
            detail: variableUniq.duplicates.join(", "),
        });
    }
    const ruleIds = pack.ruleCatalog.map((entry) => entry.id);
    const ruleUniq = uniqueIds(ruleIds);
    if (ruleUniq.missing > 0) {
        errors.push({
            code: "ruleCatalog.missingId",
            message: "ruleCatalog entries missing id",
            severity: "error",
            detail: `missing=${ruleUniq.missing}`,
        });
    }
    if (ruleUniq.duplicates.length) {
        errors.push({
            code: "ruleCatalog.duplicateId",
            message: "ruleCatalog entries duplicate ids",
            severity: "error",
            detail: ruleUniq.duplicates.join(", "),
        });
    }
    const runtimeIds = new Set(pack.runtimeRuleCards.map((entry) => entry.propositionId));
    const joinRate = pack.ruleCatalog.length ? runtimeIds.size / pack.ruleCatalog.length : 0;
    if (joinRate < 0.95) {
        errors.push({
            code: "runtimeRuleCards.joinRate",
            message: "join rate below 95%",
            severity: "error",
            detail: `joinRate=${joinRate.toFixed(2)}`,
        });
        reviewQueue.push({
            id: "runtimeRuleCards",
            reason: "join rate below threshold",
            detail: `joinRate=${joinRate.toFixed(2)}`,
            severity: "high",
        });
    }
    for (const card of pack.runtimeRuleCards) {
        if (!card.condition) {
            reviewQueue.push({
                id: card.id,
                reason: "missing condition",
                severity: "high",
            });
        }
        if (!card.action) {
            reviewQueue.push({
                id: card.id,
                reason: "missing action",
                severity: "high",
            });
        }
    }
    if (!pack.promptAssets?.systemPrompt) {
        reviewQueue.push({
            id: "promptAssets.systemPrompt",
            reason: "missing system prompt",
            severity: "medium",
        });
    }
    if (pack.variableModel.weights) {
        for (const [id, weights] of Object.entries(pack.variableModel.weights)) {
            const entries = Object.entries(weights ?? {});
            for (const [key, value] of entries) {
                if (typeof value !== "number" || value < 0 || value > 1) {
                    errors.push({
                        code: "variableModel.weights",
                        message: "variable weight out of range",
                        severity: "error",
                        path: `variableModel.weights.${id}.${key}`,
                        detail: String(value),
                    });
                }
            }
        }
    }
    else if (pack.variableModel.variables.length) {
        warnings.push({
            code: "variableModel.weights",
            message: "missing variable stat weights",
            severity: "warning",
            path: "variableModel.weights",
        });
    }
    if (options.checkFiles && pack.resourceManifest.length) {
        const root = options.packageRoot;
        for (const entry of pack.resourceManifest) {
            const targetPath = normalizePath(entry.path, root);
            try {
                await fs.access(targetPath);
            }
            catch (err) {
                reviewQueue.push({
                    id: entry.id,
                    reason: "resource missing",
                    detail: targetPath,
                    severity: "medium",
                });
                warnings.push({
                    code: "resourceManifest.missing",
                    message: "resource path missing",
                    severity: "warning",
                    path: `resourceManifest.${entry.id}`,
                    detail: targetPath,
                });
            }
        }
    }
    const stats = {
        symbolCount: pack.symbolDictionary.length,
        variableCount: pack.variableModel.variables.length,
        ruleCount: pack.ruleCatalog.length,
        runtimeRuleCount: pack.runtimeRuleCards.length,
        reviewCount: reviewQueue.length,
    };
    return {
        ok: errors.length === 0,
        errors,
        warnings,
        reviewQueue,
        stats,
    };
}
