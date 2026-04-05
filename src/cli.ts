#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { create as createTarball } from "tar";
import { QuiltApiError, QuiltClient } from "./index";
import type { OperationAcceptedResponse, QuiltAuth } from "./types/common";

type CommandHandler = (ctx: CliContext, args: string[]) => Promise<void>;

interface CliContext {
  client: QuiltClient;
  json: boolean;
}

class MutedOutput extends Writable {
  public muted = false;

  public constructor(private readonly delegate: NodeJS.WriteStream) {
    super();
  }

  public override _write(
    chunk: string | Uint8Array,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.muted) {
      this.delegate.write(chunk, encoding);
    }
    callback();
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  loadLocalEnv(argv);
  const global = parseGlobalOptions(argv);
  const auth = await ensureAuth(global.auth);
  const client = QuiltClient.connect({
    baseUrl: global.baseUrl,
    auth,
  });

  const ctx: CliContext = {
    client,
    json: global.json,
  };

  const commands = buildCommands();
  const key = commandKey(global.rest);
  const handler = commands.get(key);
  if (!handler) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  try {
    await handler(ctx, global.rest.slice(key.split(" ").length));
  } catch (error) {
    renderError(error);
    process.exitCode = 1;
  }
}

function buildCommands(): Map<string, CommandHandler> {
  return new Map<string, CommandHandler>([
    ["health", healthCommand],
    ["build", buildCommand],
    ["container create", containerCreateCommand],
    ["container list", containerListCommand],
    ["container get", containerGetCommand],
    ["container logs", containerLogsCommand],
    ["container remove", containerRemoveCommand],
    ["container exec", containerExecCommand],
    ["oci pull", ociPullCommand],
    ["oci list", ociListCommand],
    ["oci inspect", ociInspectCommand],
    ["oci history", ociHistoryCommand],
    ["operation get", operationGetCommand],
    ["operation wait", operationWaitCommand],
  ]);
}

function commandKey(args: string[]): string {
  if (args.length >= 2) {
    const two = `${args[0]} ${args[1]}`;
    if (
      two === "container create" ||
      two === "container list" ||
      two === "container get" ||
      two === "container logs" ||
      two === "container remove" ||
      two === "container exec" ||
      two === "oci pull" ||
      two === "oci list" ||
      two === "oci inspect" ||
      two === "oci history" ||
      two === "operation get" ||
      two === "operation wait"
    ) {
      return two;
    }
  }
  return args[0] ?? "";
}

function parseGlobalOptions(argv: string[]): {
  baseUrl: string;
  auth: QuiltAuth;
  json: boolean;
  rest: string[];
} {
  let json = false;
  let baseUrl =
    process.env["QUILT_API_URL"] ?? process.env["QUILT_BASE_URL"] ?? "https://backend.quilt.sh";
  let apiKey = process.env["QUILT_API_KEY"];
  let token = process.env["QUILT_TOKEN"] ?? process.env["QUILT_JWT"];
  const rest: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") {
      json = true;
      continue;
    }
    if (value === "--base-url") {
      baseUrl = requiredValue(argv, ++index, "--base-url");
      continue;
    }
    if (value === "--api-key") {
      apiKey = requiredValue(argv, ++index, "--api-key");
      continue;
    }
    if (value === "--token") {
      token = requiredValue(argv, ++index, "--token");
      continue;
    }
    rest.push(...argv.slice(index));
    break;
  }

  const auth: QuiltAuth = apiKey
    ? { type: "apiKey", apiKey }
    : token
      ? { type: "bearer", token }
      : { type: "none" };

  return { baseUrl, auth, json, rest };
}

function loadLocalEnv(argv: string[]): void {
  const cwd = process.cwd();
  const preparse = {
    noEnv: argv.includes("--no-env"),
    envFile: firstValue(argv, "--env-file"),
  };
  if (preparse.noEnv) {
    return;
  }
  for (const fileName of [".env", ".env.local"]) {
    loadEnvFile(path.join(cwd, fileName));
  }
  if (preparse.envFile) {
    loadEnvFile(path.resolve(cwd, preparse.envFile));
  }
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  const content = readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(parseDotEnv(content))) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseDotEnv(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const exportLine = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = exportLine.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = exportLine.slice(0, separator).trim();
    let value = exportLine.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

async function ensureAuth(auth: QuiltAuth): Promise<QuiltAuth> {
  if (auth.type !== "none") {
    return auth;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return auth;
  }

  const output = new MutedOutput(process.stderr);
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });

  try {
    process.stderr.write("Enter your API key: ");
    output.muted = true;
    const answer = (await rl.question("")).trim();
    process.stderr.write("\n");
    return answer.length > 0 ? { type: "apiKey", apiKey: answer } : auth;
  } finally {
    output.muted = false;
    rl.close();
  }
}

async function healthCommand(ctx: CliContext): Promise<void> {
  const response = await ctx.client.system.health();
  printResult(ctx, response);
}

async function buildCommand(ctx: CliContext, args: string[]): Promise<void> {
  const parsed = parseOptions(args, {
    "--context": ".",
    "--dockerfile": "Dockerfile",
    "--tag": "",
    "--target": "",
    "--build-arg": [],
    "--no-wait": false,
  });

  const tag = stringOption(parsed, "--tag");
  if (!tag) {
    throw new Error("build requires --tag <image-reference>");
  }

  const contextDir = path.resolve(stringOption(parsed, "--context") ?? ".");
  const archive = await createContextArchive(contextDir);
  const upload = await ctx.client.images.uploadBuildContext(archive.toString("base64"));
  if (!upload) {
    throw new Error("build context upload returned no response body");
  }
  const targetStage = optionalString(parsed, "--target");
  const buildBody = {
    context_id: upload.context_id,
    image_reference: tag,
    dockerfile_path: stringOption(parsed, "--dockerfile") ?? "Dockerfile",
    build_args: buildArgMap(arrayOption(parsed, "--build-arg")),
    ...(targetStage ? { target_stage: targetStage } : {}),
  };
  const accepted = await ctx.client.images.build(buildBody);

  if (booleanOption(parsed, "--no-wait")) {
    printResult(ctx, {
      context_id: upload.context_id,
      size_bytes: upload.size_bytes,
      operation_id: accepted.operation_id,
      status_url: accepted.status_url,
    });
    return;
  }

  const result = await waitForOperation(ctx.client, accepted);
  printResult(ctx, result);
}

async function containerCreateCommand(ctx: CliContext, args: string[]): Promise<void> {
  const parsed = parseOptions(args, {
    "--name": "",
    "--image": "prod",
    "--oci": false,
    "--env": [],
    "--memory": "",
    "--cpu": "",
    "--volume": [],
    "--workdir": "",
    "--wait": false,
    "--": [],
  });

  const image = stringOption(parsed, "--image") ?? "prod";
  const name = optionalString(parsed, "--name");
  const oci = booleanOption(parsed, "--oci") || !["prod", "prod-gui"].includes(image);
  const command = arrayOption(parsed, "--");

  const memoryLimitMb = numberOption(parsed, "--memory");
  const cpuLimitPercent = numberOption(parsed, "--cpu");
  const workdir = optionalString(parsed, "--workdir");
  const environment = keyValueMap(arrayOption(parsed, "--env"));
  const volumes = arrayOption(parsed, "--volume");
  const containerBody = {
    ...(name ? { name } : {}),
    image,
    ...(oci ? { oci: true } : {}),
    ...(Object.keys(environment).length > 0 ? { environment } : {}),
    ...(memoryLimitMb !== undefined ? { memory_limit_mb: memoryLimitMb } : {}),
    ...(cpuLimitPercent !== undefined ? { cpu_limit_percent: cpuLimitPercent } : {}),
    ...(volumes.length > 0 ? { volumes } : {}),
    ...(workdir ? { working_directory: workdir } : {}),
    ...(command.length > 0 ? { command } : {}),
  } as import("./modules/containers").CreateContainerRequest;
  const accepted = await ctx.client.containers.create(containerBody, "async");

  if (!booleanOption(parsed, "--wait")) {
    printResult(ctx, accepted);
    return;
  }

  const result = await waitForOperation(ctx.client, asAcceptedOperation(accepted));
  printResult(ctx, result);
}

async function containerListCommand(ctx: CliContext, args: string[]): Promise<void> {
  const parsed = parseOptions(args, { "--state": "" });
  const state = optionalString(parsed, "--state");
  const response = await ctx.client.containers.list(state ? { state } : undefined);
  printResult(ctx, response);
}

async function containerGetCommand(ctx: CliContext, args: string[]): Promise<void> {
  const identifier = args[0];
  if (!identifier) {
    throw new Error("container get requires <id-or-name>");
  }
  printResult(ctx, await ctx.client.containers.get(identifier));
}

async function containerLogsCommand(ctx: CliContext, args: string[]): Promise<void> {
  const identifier = args[0];
  if (!identifier) {
    throw new Error("container logs requires <id-or-name>");
  }
  const parsed = parseOptions(args.slice(1), { "--limit": "" });
  const limit = numberOption(parsed, "--limit");
  printResult(ctx, await ctx.client.containers.logs(identifier, limit ? { limit } : undefined));
}

async function containerRemoveCommand(ctx: CliContext, args: string[]): Promise<void> {
  const identifier = args[0];
  if (!identifier) {
    throw new Error("container remove requires <id-or-name>");
  }
  const parsed = parseOptions(args.slice(1), { "--wait": false });
  const accepted = await ctx.client.containers.remove(identifier, "async");
  if (!booleanOption(parsed, "--wait")) {
    printResult(ctx, accepted);
    return;
  }
  printResult(ctx, await waitForOperation(ctx.client, asAcceptedOperation(accepted)));
}

async function containerExecCommand(ctx: CliContext, args: string[]): Promise<void> {
  const identifier = args[0];
  if (!identifier) {
    throw new Error("container exec requires <id-or-name>");
  }
  const parsed = parseOptions(args.slice(1), {
    "--workdir": "",
    "--capture-output": false,
    "--detach": false,
    "--timeout-ms": "",
    "--": [],
  });
  const command = arrayOption(parsed, "--");
  if (command.length === 0) {
    throw new Error("container exec requires a command after --");
  }
  const workdir = optionalString(parsed, "--workdir");
  const timeoutMs = numberOption(parsed, "--timeout-ms");
  printResult(
    ctx,
    await ctx.client.containers.exec(identifier, {
      command,
      ...(workdir ? { workdir } : {}),
      ...(booleanOption(parsed, "--capture-output") ? { capture_output: true } : {}),
      ...(booleanOption(parsed, "--detach") ? { detach: true } : {}),
      ...(timeoutMs !== undefined ? { timeout_ms: timeoutMs } : {}),
    }),
  );
}

async function ociPullCommand(ctx: CliContext, args: string[]): Promise<void> {
  const parsed = parseOptions(args, {
    "--reference": "",
    "--force": false,
    "--platform": "",
    "--username": "",
    "--password": "",
  });
  const reference = stringOption(parsed, "--reference");
  if (!reference) {
    throw new Error("oci pull requires --reference <oci-reference>");
  }
  const pullBody: import("./modules/images").OciPullRequest = {
    reference,
    force: booleanOption(parsed, "--force"),
  };
  const platform = optionalString(parsed, "--platform");
  if (platform) {
    pullBody.platform = platform;
  }
  const username = optionalString(parsed, "--username");
  if (username) {
    pullBody.registry_username = username;
  }
  const password = optionalString(parsed, "--password");
  if (password) {
    pullBody.registry_password = password;
  }
  printResult(ctx, await ctx.client.images.pull(pullBody));
}

async function ociListCommand(ctx: CliContext, args: string[]): Promise<void> {
  const parsed = parseOptions(args, { "--filter": "", "--include-digests": false });
  const listQuery: { filter?: string; include_digests?: boolean } = {};
  const filter = optionalString(parsed, "--filter");
  if (filter) {
    listQuery.filter = filter;
  }
  if (booleanOption(parsed, "--include-digests")) {
    listQuery.include_digests = true;
  }
  printResult(ctx, await ctx.client.images.list(listQuery));
}

async function ociInspectCommand(ctx: CliContext, args: string[]): Promise<void> {
  const reference = firstValue(args, "--reference");
  if (!reference) {
    throw new Error("oci inspect requires --reference <oci-reference>");
  }
  printResult(ctx, await ctx.client.images.inspect(reference));
}

async function ociHistoryCommand(ctx: CliContext, args: string[]): Promise<void> {
  const reference = firstValue(args, "--reference");
  if (!reference) {
    throw new Error("oci history requires --reference <oci-reference>");
  }
  printResult(ctx, await ctx.client.images.history(reference));
}

async function operationGetCommand(ctx: CliContext, args: string[]): Promise<void> {
  const operationId = args[0];
  if (!operationId) {
    throw new Error("operation get requires <operation-id>");
  }
  printResult(ctx, await ctx.client.platform.getOperationStatus(operationId));
}

async function operationWaitCommand(ctx: CliContext, args: string[]): Promise<void> {
  const operationId = args[0];
  if (!operationId) {
    throw new Error("operation wait requires <operation-id>");
  }
  const parsed = parseOptions(args.slice(1), { "--timeout-ms": "", "--interval-ms": "" });
  printResult(
    ctx,
    await ctx.client.awaitOperation(operationId, {
      timeoutMs: numberOption(parsed, "--timeout-ms") ?? 300_000,
      intervalMs: numberOption(parsed, "--interval-ms") ?? 1_000,
    }),
  );
}

async function createContextArchive(contextDir: string): Promise<Buffer> {
  const dockerignorePath = path.join(contextDir, ".dockerignore");
  const ignore = await readDockerignore(dockerignorePath);
  const tempDir = await mkdtemp(path.join(tmpdir(), "quilt-sdk-build-"));
  const archivePath = path.join(tempDir, "context.tar.gz");
  try {
    await createTarball(
      {
        file: archivePath,
        gzip: true,
        cwd: contextDir,
        portable: true,
        filter: (entryPath) => shouldIncludeEntry(entryPath, ignore),
      },
      ["."],
    );
    return await readFile(archivePath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function readDockerignore(filePath: string): Promise<string[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function shouldIncludeEntry(entryPath: string, ignore: string[]): boolean {
  const normalized = entryPath.replaceAll("\\", "/").replace(/^\.\/?/u, "");
  if (normalized.length === 0) {
    return true;
  }
  for (const pattern of ignore) {
    const candidate = pattern.replaceAll("\\", "/").replace(/^\.\/?/u, "");
    if (normalized === candidate || normalized.startsWith(`${candidate}/`)) {
      return false;
    }
  }
  return true;
}

async function waitForOperation(client: QuiltClient, accepted: OperationAcceptedResponse) {
  return await client.awaitOperation(accepted.operation_id, { timeoutMs: 600_000 });
}

function parseOptions(
  args: string[],
  defaults: Record<string, string | boolean | string[]>,
): Map<string, string | boolean | string[]> {
  const values = new Map<string, string | boolean | string[]>();
  for (const [key, value] of Object.entries(defaults)) {
    values.set(key, Array.isArray(value) ? [...value] : value);
  }

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      break;
    }
    if (token === "--") {
      values.set("--", args.slice(index + 1));
      break;
    }
    if (!token.startsWith("--")) {
      const positional = (values.get("_") as string[] | undefined) ?? [];
      positional.push(token);
      values.set("_", positional);
      continue;
    }

    const current = values.get(token);
    if (typeof current === "boolean") {
      values.set(token, true);
      continue;
    }
    if (Array.isArray(current)) {
      const next = requiredValue(args, ++index, token);
      values.set(token, [...current, next]);
      continue;
    }
    values.set(token, requiredValue(args, ++index, token));
  }

  return values;
}

function requiredValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function asAcceptedOperation(value: unknown): OperationAcceptedResponse {
  if (
    typeof value === "object" &&
    value !== null &&
    "operation_id" in value &&
    "status_url" in value
  ) {
    return value as OperationAcceptedResponse;
  }
  throw new Error("Expected an operation response from the API");
}

function stringOption(
  values: Map<string, string | boolean | string[]>,
  key: string,
): string | undefined {
  const value = values.get(key);
  return typeof value === "string" ? value : undefined;
}

function optionalString(
  values: Map<string, string | boolean | string[]>,
  key: string,
): string | undefined {
  const value = stringOption(values, key);
  return value && value.length > 0 ? value : undefined;
}

function booleanOption(values: Map<string, string | boolean | string[]>, key: string): boolean {
  return values.get(key) === true;
}

function arrayOption(values: Map<string, string | boolean | string[]>, key: string): string[] {
  const value = values.get(key);
  return Array.isArray(value) ? value : [];
}

function numberOption(
  values: Map<string, string | boolean | string[]>,
  key: string,
): number | undefined {
  const value = optionalString(values, key);
  return value ? Number(value) : undefined;
}

function keyValueMap(values: string[]): Record<string, string> {
  const entries = values.map((entry) => {
    const [key, value] = splitPair(entry);
    return [key, value] as const;
  });
  return Object.fromEntries(entries);
}

function buildArgMap(values: string[]): Record<string, string> {
  return keyValueMap(values);
}

function splitPair(entry: string): [string, string] {
  const separator = entry.indexOf("=");
  if (separator === -1) {
    throw new Error(`Expected KEY=VALUE, got '${entry}'`);
  }
  return [entry.slice(0, separator), entry.slice(separator + 1)];
}

function firstValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function printResult(ctx: CliContext, value: unknown): void {
  if (ctx.json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (typeof value === "string") {
    console.log(value);
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

function renderError(error: unknown): void {
  if (error instanceof QuiltApiError) {
    console.error(error.message);
    if (error.body) {
      console.error(JSON.stringify(error.body, null, 2));
    }
    return;
  }
  if (error instanceof Error) {
    console.error(error.message);
    return;
  }
  console.error(String(error));
}

function printUsage(): void {
  const scriptName = path.basename(
    fileURLToPath(import.meta.url),
    path.extname(fileURLToPath(import.meta.url)),
  );
  console.log(
    [
      `Usage: ${scriptName} [--base-url URL] [--api-key KEY|--token JWT] [--json] <command>`,
      "",
      "Commands:",
      "  health",
      "  build --tag <oci-ref> [--context dir] [--dockerfile Dockerfile] [--build-arg KEY=VALUE] [--target stage] [--no-wait]",
      "  container create [--name name] [--image ref-or-alias] [--oci] [--env KEY=VALUE] [--memory MB] [--cpu PERCENT] [--volume spec] [--workdir dir] [--wait] -- <command...>",
      "  container list [--state state]",
      "  container get <id-or-name>",
      "  container logs <id-or-name> [--limit N]",
      "  container remove <id-or-name> [--wait]",
      "  container exec <id-or-name> [--workdir dir] [--capture-output] [--detach] [--timeout-ms N] -- <command...>",
      "  oci pull --reference <oci-ref> [--force] [--platform platform] [--username user] [--password pass]",
      "  oci list [--filter value] [--include-digests]",
      "  oci inspect --reference <oci-ref>",
      "  oci history --reference <oci-ref>",
      "  operation get <operation-id>",
      "  operation wait <operation-id> [--timeout-ms N] [--interval-ms N]",
    ].join("\n"),
  );
}

void main();
