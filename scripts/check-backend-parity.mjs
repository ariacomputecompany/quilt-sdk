import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sdkSrcRoot = path.resolve(repoRoot, "src");
const backendContractPath = path.resolve(repoRoot, "../quilt-prod/API_CONTRACT.json");
const backendApiDocPath = path.resolve(repoRoot, "../quilt-prod/API.md");
const backendRoutesPath = path.resolve(repoRoot, "../quilt-prod/src/http/routes.rs");

const clientMethodPattern =
  /client\.(get|post|put|patch|delete|getResponse|postResponse|putResponse|patchResponse|deleteResponse)\(\s*(["`])([\s\S]*?)\2/gm;
const rawMethodPattern =
  /client\.raw(?:<[\s\S]*?>)?(?:Response)?\(\s*(["`])([A-Za-z]+)\1\s*,\s*(["`])([\s\S]*?)\3/gm;
const eventsPathPattern = /path:\s*(["`])([\s\S]*?)\1/gm;
const apiDocRoutePattern = /^### `([A-Z]+) (\/api\/[^`]+)`$/gm;

async function main() {
  const contract = JSON.parse(await readFile(backendContractPath, "utf8"));
  const apiDoc = await readFile(backendApiDocPath, "utf8");
  const routesFile = await readFile(backendRoutesPath, "utf8");
  const knownPaths = buildKnownPaths(contract, apiDoc, routesFile);
  const sourceFiles = await collectSourceFiles(sdkSrcRoot);

  const failures = [];
  const seen = new Set();

  for (const filePath of sourceFiles) {
    const source = await readFile(filePath, "utf8");

    for (const match of source.matchAll(clientMethodPattern)) {
      const method = match[1]?.replace(/Response$/, "").toLowerCase();
      const routeLiteral = match[3];
      if (!method || !routeLiteral || !routeLiteral.includes("/api/")) {
        continue;
      }
      const route = normalizeRouteLiteral(routeLiteral);
      recordContractFailure({
        filePath,
        route,
        method,
        knownPaths,
        failures,
        seen,
      });
    }

    for (const match of source.matchAll(rawMethodPattern)) {
      const method = match[2]?.toLowerCase();
      const routeLiteral = match[4];
      if (!method || !routeLiteral || !routeLiteral.includes("/api/")) {
        continue;
      }
      const route = normalizeRouteLiteral(routeLiteral);
      recordContractFailure({
        filePath,
        route,
        method,
        knownPaths,
        failures,
        seen,
      });
    }

    if (filePath.endsWith(path.join("realtime", "events.ts"))) {
      for (const match of source.matchAll(eventsPathPattern)) {
        const routeLiteral = match[2];
        if (!routeLiteral || !routeLiteral.includes("/api/")) {
          continue;
        }
        const route = normalizeRouteLiteral(routeLiteral);
        recordContractFailure({
          filePath,
          route,
          method: "get",
          knownPaths,
          failures,
          seen,
        });
      }
    }
  }

  if (failures.length > 0) {
    process.stderr.write("SDK/backend parity audit failed:\n");
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `SDK/backend parity audit passed for ${seen.size} route+method references against ${backendContractPath}\n`,
  );
}

function normalizeRouteLiteral(routeLiteral) {
  return routeLiteral
    .replace(/\$\{[\s\S]*?\}/g, "{param}")
    .replace(/(?<!\/)\{param\}(?=$|[?#])/g, "")
    .replace(/\?.*$/g, "");
}

function recordContractFailure({ filePath, route, method, knownPaths, failures, seen }) {
  const key = `${method.toUpperCase()} ${route}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);

  const contractPath = findMatchingContractPath(route, knownPaths);
  const operation = contractPath ? knownPaths.get(contractPath) : undefined;
  if (!operation) {
    failures.push(
      `${key} referenced in ${relativePath(filePath)} is missing from backend contract`,
    );
    return;
  }

  if (!operation.has(method)) {
    failures.push(
      `${key} referenced in ${relativePath(filePath)} is missing method ${method.toUpperCase()} in backend contract`,
    );
  }
}

function findMatchingContractPath(route, knownPaths) {
  if (knownPaths.has(route)) {
    return route;
  }

  const routeShape = shapeRoute(route);
  for (const contractPath of knownPaths.keys()) {
    if (shapeRoute(contractPath) === routeShape) {
      return contractPath;
    }
  }

  return null;
}

function shapeRoute(route) {
  return route.replace(/\{[^/]+\}/g, "{}");
}

function buildKnownPaths(contract, apiDoc, routesFile) {
  const knownPaths = new Map();

  for (const [route, operations] of Object.entries(contract.paths ?? {})) {
    const normalizedRoute = normalizeBackendRoute(route);
    const operationSet = knownPaths.get(normalizedRoute) ?? new Set();
    for (const method of Object.keys(operations ?? {})) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        operationSet.add(method);
      }
    }
    knownPaths.set(normalizedRoute, operationSet);
  }

  for (const match of apiDoc.matchAll(apiDocRoutePattern)) {
    const method = match[1]?.toLowerCase();
    const route = match[2];
    if (!method || !route) {
      continue;
    }
    const normalizedRoute = normalizeBackendRoute(route);
    const operationSet = knownPaths.get(normalizedRoute) ?? new Set();
    operationSet.add(method);
    knownPaths.set(normalizedRoute, operationSet);
  }

  for (const block of routesFile.split(".route(").slice(1)) {
    const routeMatch = block.match(/^\s*"([^"]+)"/);
    const route = routeMatch?.[1];
    if (!route || !route.startsWith("/api/")) {
      continue;
    }

    const normalizedRoute = normalizeBackendRoute(route);
    const operationSet = knownPaths.get(normalizedRoute) ?? new Set();
    for (const methodMatch of block.matchAll(/\b(get|post|put|patch|delete)\s*\(/gm)) {
      const method = methodMatch[1]?.toLowerCase();
      if (method) {
        operationSet.add(method);
      }
    }
    knownPaths.set(normalizedRoute, operationSet);
  }

  return knownPaths;
}

function normalizeBackendRoute(route) {
  return route.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

async function collectSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(entryPath);
    }
  }

  return files;
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath) || filePath;
}

main().catch((error) => {
  process.stderr.write(`SDK/backend parity audit failed: ${String(error)}\n`);
  process.exitCode = 1;
});
