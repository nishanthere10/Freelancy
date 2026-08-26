import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Security: Static Secrets & Bundle Exposure Audit", () => {
  const rootDir = path.resolve(__dirname, "../../../../");

  it("ensures no server-only secrets are referenced in frontend web source", () => {
    const webSrcDir = path.resolve(rootDir, "apps/web/src");
    if (!fs.existsSync(webSrcDir)) return;

    function scanDir(dir: string): string[] {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (
          entry.isDirectory() &&
          entry.name !== "node_modules" &&
          entry.name !== ".next"
        ) {
          files.push(...scanDir(fullPath));
        } else if (
          entry.isFile() &&
          /\.(ts|tsx|js|jsx|json)$/.test(entry.name)
        ) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const allWebFiles = scanDir(webSrcDir);
    const forbiddenPatterns = [
      "CLERK_SECRET_KEY",
      "DATABASE_URL",
      "CLOUDFLARE_API_TOKEN",
      "VERCEL_TOKEN",
    ];

    for (const file of allWebFiles) {
      const content = fs.readFileSync(file, "utf-8");
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toContain(`process.env.${pattern}`);
        expect(content).not.toContain(`env.${pattern}`);
      }
    }
  });

  it("verifies gitignore contains sensible secret file exclusions", () => {
    const gitignorePath = path.resolve(rootDir, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      expect(content).toContain(".env");
      expect(content).toContain("node_modules");
    }
  });
});
