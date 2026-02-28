import path from "path";
import { convertGameEnginePackage } from "./index";
import type { AIProviderConfig } from "../aiEngine";
import type { TaskAIConfig } from "../../types";

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.split("=");
    return [key.replace(/^--/, ""), value ?? "true"];
  })
);

const cwd = process.cwd();
const packageRoot = args.get("packageRoot") || path.resolve(cwd, "docs/game-engine-package");
const outputDir = args.get("outputDir") || path.resolve(cwd, "public/engine-pack");
const outputFile = args.get("outputFile") || path.join(outputDir, "evaluation-pack.v1.json");
const reviewQueueFile = args.get("reviewQueueFile") || path.join(outputDir, "review-queue.json");
const reportFile = args.get("reportFile") || path.join(outputDir, "conversion-report.md");
const useLLM = args.get("useLLM") === "true";

const provider = (process.env.ENGINE_PACK_AI_PROVIDER || process.env.AI_PROVIDER || "").toLowerCase();
const aiConfig: AIProviderConfig | undefined = useLLM
  ? provider === "openai"
    ? {
        provider: "openai",
        openai: {
          apiKey: process.env.OPENAI_API_KEY || "",
          baseUrl: process.env.OPENAI_BASE_URL,
          model: process.env.OPENAI_MODEL,
        },
      }
    : provider === "gemini"
      ? {
          provider: "gemini",
          gemini: { apiKey: process.env.GEMINI_API_KEY },
        }
      : undefined
  : undefined;

const taskConfig: TaskAIConfig | undefined = useLLM
  ? {
      geminiModel: process.env.GEMINI_MODEL,
      openaiModel: process.env.OPENAI_MODEL,
      temperature: 0.2,
      maxOutputTokens: 2048,
      topP: 0.9,
      topK: 40,
      jsonMode: true,
      streaming: false,
      timeoutMs: 120000,
      maxRetries: 2,
      retryDelayMs: 1000,
    }
  : undefined;

const run = async () => {
  const result = await convertGameEnginePackage({
    packageRoot,
    outputFile,
    reviewQueueFile,
    reportFile,
    targetSchemaVersion: "evaluation-pack.v1",
    useLLM,
    aiConfig,
    taskConfig,
  });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
