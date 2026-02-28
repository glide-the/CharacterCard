import path from "path";
import { convertGameEnginePackage } from "./services/enginePackConverter/index.js";

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

const run = async () => {
  const result = await convertGameEnginePackage({
    packageRoot,
    outputFile,
    reviewQueueFile,
    reportFile,
    targetSchemaVersion: "evaluation-pack.v1",
    useLLM,
  });
  console.log(JSON.stringify(result, null, 2));
};

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
