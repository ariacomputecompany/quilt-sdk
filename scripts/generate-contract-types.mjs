import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const repoRoot = process.cwd();
const contractPath = path.resolve(repoRoot, "../quilt-prod/API_CONTRACT.json");
const outputPath = path.resolve(repoRoot, "src/generated/platform-contract.ts");
const cliPath = path.resolve(repoRoot, "node_modules/.bin/openapi-typescript");

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });

  await execFileAsync(cliPath, [contractPath, "-o", outputPath, "--alphabetize", "--enum"]);

  process.stdout.write(`Generated ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to generate contract types: ${String(error)}\n`);
  process.exitCode = 1;
});
