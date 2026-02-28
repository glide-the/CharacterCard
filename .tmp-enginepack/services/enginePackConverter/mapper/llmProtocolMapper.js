import { executeWithRetry, generateContent } from "../../aiEngine.js";
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function clamp01(value) {
    if (!Number.isFinite(value))
        return 0;
    if (value < 0)
        return 0;
    if (value > 1)
        return 1;
    return value;
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
function formatRulesForPrompt(rules) {
    return rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        definition: rule.definition,
        constraints: rule.constraints,
        advanced: rule.advanced,
    }));
}
function formatVariablesForPrompt(variables) {
    return variables.map((variable) => ({
        id: variable.id,
        name: variable.name,
        definition: variable.definition,
        constraints: variable.constraints,
    }));
}
function pickPromptSource(markdownAssets) {
    return markdownAssets.find((asset) => asset.relPath.includes("game-engine-generator-prompt"));
}
function buildPromptContext(pack, deterministic) {
    const promptAsset = pickPromptSource(pack.markdownAssets);
    const promptText = promptAsset?.rawText ? promptAsset.rawText.trim() : "";
    const promptSnippet = promptText.length > 8000 ? `${promptText.slice(0, 8000)}\n...` : promptText;
    const payload = {
        meta: deterministic.meta,
        rules: formatRulesForPrompt(deterministic.ruleCatalog),
        variables: formatVariablesForPrompt(deterministic.variableModel.variables),
        promptSource: promptSnippet,
        promptSourcePath: promptAsset?.relPath,
    };
    return JSON.stringify(payload, null, 2);
}
function buildSystemInstruction() {
    return [
        "You are a protocol mapping assistant.",
        "Your job is to infer missing semantic mappings and prompt assets from the provided engine pack context.",
        "Return only JSON. Do not include any explanation outside the JSON.",
        "Always include confidence scores between 0 and 1.",
        "If you are unsure, use type UNKNOWN and add unresolvedFields.",
    ].join("\n");
}
function buildUserPrompt() {
    return [
        "Given the JSON context, produce semantic mappings:",
        "1) Classify each rule into CONSTRAINT/BONUS/RISK/REALITY/UNKNOWN.",
        "2) Assign variable weights for credibility/stress/connections (0-1).",
        "3) Extract promptAssets: systemPrompt, constraints, examples. Keep them concise but complete.",
        "4) Fill unresolvedFields for anything ambiguous.",
        "Return strict JSON matching the schema.",
    ].join("\n");
}
function buildJsonSchema() {
    return {
        type: "object",
        additionalProperties: false,
        required: ["ruleTypeHints", "variableWeights", "promptAssets", "unresolvedFields"],
        properties: {
            ruleTypeHints: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "type", "confidence"],
                    properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["CONSTRAINT", "BONUS", "RISK", "REALITY", "UNKNOWN"] },
                        confidence: { type: "number" },
                        evidence: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                sourcePath: { type: "string" },
                                lineRange: { type: "string" },
                                excerpt: { type: "string" },
                            },
                        },
                        unresolvedFields: { type: "array", items: { type: "string" } },
                    },
                },
            },
            variableWeights: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "weights", "confidence"],
                    properties: {
                        id: { type: "string" },
                        weights: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                credibility: { type: "number" },
                                stress: { type: "number" },
                                connections: { type: "number" },
                            },
                        },
                        confidence: { type: "number" },
                        evidence: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                sourcePath: { type: "string" },
                                lineRange: { type: "string" },
                                excerpt: { type: "string" },
                            },
                        },
                        unresolvedFields: { type: "array", items: { type: "string" } },
                    },
                },
            },
            promptAssets: {
                type: "object",
                additionalProperties: false,
                properties: {
                    systemPrompt: { type: "string" },
                    constraints: { type: "string" },
                    examples: { type: "string" },
                    rawBlocks: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["content"],
                            properties: {
                                content: { type: "string" },
                                sourcePath: { type: "string" },
                                lineRange: { type: "string" },
                                confidence: { type: "number" },
                            },
                        },
                    },
                },
            },
            unresolvedFields: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "reason"],
                    properties: {
                        id: { type: "string" },
                        reason: { type: "string" },
                    },
                },
            },
        },
    };
}
function parsePayload(raw) {
    if (!isRecord(raw)) {
        return { ruleTypeHints: [], variableWeights: [], promptAssets: {}, unresolvedFields: [] };
    }
    const ruleTypeHints = Array.isArray(raw.ruleTypeHints) ? raw.ruleTypeHints : [];
    const variableWeights = Array.isArray(raw.variableWeights) ? raw.variableWeights : [];
    const promptAssets = isRecord(raw.promptAssets) ? raw.promptAssets : {};
    const unresolvedFields = Array.isArray(raw.unresolvedFields) ? raw.unresolvedFields : [];
    return {
        ruleTypeHints: ruleTypeHints,
        variableWeights: variableWeights,
        promptAssets,
        unresolvedFields: unresolvedFields,
    };
}
export async function mapWithLlmProtocol(pack, deterministic, config, taskConfig) {
    const warnings = [];
    const reviewQueue = [];
    const traces = [];
    const systemInstruction = buildSystemInstruction();
    const userPrompt = `${buildUserPrompt()}\n\nContext JSON:\n${buildPromptContext(pack, deterministic)}`;
    let parsed = null;
    try {
        const jsonSchema = config.provider === "openai" ? buildJsonSchema() : undefined;
        const response = await executeWithRetry(() => generateContent(config, {
            prompt: userPrompt,
            systemInstruction,
            jsonSchema,
            jsonMode: true,
        }, taskConfig), taskConfig);
        const raw = JSON.parse(response);
        parsed = parsePayload(raw);
    }
    catch (err) {
        warnings.push(`LLM protocol mapping failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    const ruleTypeOverrides = {};
    const variableStatWeights = {};
    const promptAssets = parsed?.promptAssets ?? {};
    if (parsed) {
        for (const hint of parsed.ruleTypeHints) {
            const ruleId = typeof hint.id === "string" ? hint.id : undefined;
            if (!ruleId)
                continue;
            const normalizedType = normalizeRuleType(hint.type);
            const confidence = clamp01(typeof hint.confidence === "number" ? hint.confidence : 0);
            if (normalizedType !== "UNKNOWN") {
                ruleTypeOverrides[ruleId] = normalizedType;
            }
            else {
                reviewQueue.push({ id: ruleId, reason: "unknown rule type", detail: "LLM returned UNKNOWN" });
            }
            if (confidence < 0.75) {
                reviewQueue.push({ id: ruleId, reason: "low confidence rule type", detail: `confidence=${confidence}` });
            }
            if (hint.evidence?.sourcePath) {
                traces.push({ id: ruleId, targetPath: "ruleCatalog.type", sourcePath: hint.evidence.sourcePath, confidence });
            }
            if (Array.isArray(hint.unresolvedFields) && hint.unresolvedFields.length) {
                reviewQueue.push({ id: ruleId, reason: "unresolved fields", detail: hint.unresolvedFields.join(", ") });
            }
        }
        for (const hint of parsed.variableWeights) {
            const varId = typeof hint.id === "string" ? hint.id : undefined;
            if (!varId)
                continue;
            const weights = hint.weights ?? {};
            variableStatWeights[varId] = {
                credibility: typeof weights.credibility === "number" ? clamp01(weights.credibility) : undefined,
                stress: typeof weights.stress === "number" ? clamp01(weights.stress) : undefined,
                connections: typeof weights.connections === "number" ? clamp01(weights.connections) : undefined,
            };
            const confidence = clamp01(typeof hint.confidence === "number" ? hint.confidence : 0);
            if (confidence < 0.75) {
                reviewQueue.push({ id: varId, reason: "low confidence variable weights", detail: `confidence=${confidence}` });
            }
            if (hint.evidence?.sourcePath) {
                traces.push({ id: varId, targetPath: "variableModel.weights", sourcePath: hint.evidence.sourcePath, confidence });
            }
            if (Array.isArray(hint.unresolvedFields) && hint.unresolvedFields.length) {
                reviewQueue.push({ id: varId, reason: "unresolved fields", detail: hint.unresolvedFields.join(", ") });
            }
        }
        for (const unresolved of parsed.unresolvedFields) {
            if (!unresolved || typeof unresolved.id !== "string")
                continue;
            reviewQueue.push({ id: unresolved.id, reason: "unresolved", detail: unresolved.reason });
        }
    }
    return {
        ruleTypeOverrides,
        variableStatWeights,
        promptAssets,
        reviewQueue,
        warnings,
        traces,
        raw: parsed ?? undefined,
    };
}
