import { promises as fs } from "fs";
import path from "path";
export async function parseJsonFile(filePath, root) {
    try {
        const raw = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(raw);
        return {
            path: filePath,
            relPath: root ? path.relative(root, filePath) : filePath,
            data,
        };
    }
    catch (err) {
        return {
            path: filePath,
            relPath: root ? path.relative(root, filePath) : filePath,
            data: null,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
