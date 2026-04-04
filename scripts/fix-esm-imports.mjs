import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const distRoot = path.resolve(repoRoot, "dist");

const importLikePattern =
  /((?:import|export)\s+(?:[^"'`]*?\s+from\s+)?|import\s*\()(["'])(\.[^"'`()]+)\2/g;

function needsJsExtension(specifier) {
  return specifier.startsWith(".") && !path.extname(specifier);
}

function rewriteSpecifiers(source) {
  return source.replace(importLikePattern, (full, prefix, quote, specifier) => {
    if (!needsJsExtension(specifier)) {
      return full;
    }
    return `${prefix}${quote}${specifier}.js${quote}`;
  });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(target);
      continue;
    }
    if (!entry.isFile() || !target.endsWith(".js")) {
      continue;
    }
    const content = await readFile(target, "utf8");
    const rewritten = rewriteSpecifiers(content);
    if (rewritten !== content) {
      await writeFile(target, rewritten, "utf8");
    }
  }
}

async function main() {
  const distStats = await stat(distRoot).catch(() => null);
  if (!distStats?.isDirectory()) {
    throw new Error(`dist directory does not exist: ${distRoot}`);
  }
  await walk(distRoot);
  process.stdout.write(`Rewrote ESM imports in ${distRoot}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to rewrite ESM imports: ${String(error)}\n`);
  process.exitCode = 1;
});
