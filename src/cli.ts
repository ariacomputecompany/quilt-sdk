#!/usr/bin/env node
/**
 * Quilt CLI
 *
 * Command-line interface for the Quilt container runtime.
 */

import Quilt from './wrapper';
import { loadConfig, saveConfig, getConfigPath, resolveConfig } from './config';
import type { QuiltConfig } from './config';

const VERSION = '2.1.0';

interface Command {
  name: string;
  description: string;
  usage: string;
  run: (args: string[]) => Promise<void>;
}

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg: string) {
  console.log(msg);
}

function error(msg: string) {
  console.error(`${colors.red}Error:${colors.reset} ${msg}`);
}

function success(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function printHelp() {
  log(`
${colors.bold}Quilt CLI${colors.reset} v${VERSION}
Container runtime for AI agents

${colors.bold}USAGE${colors.reset}
  quilt <command> [options]

${colors.bold}CONTAINER COMMANDS${colors.reset}
  ${colors.cyan}config${colors.reset}      Manage configuration (api-key, endpoint)
  ${colors.cyan}containers${colors.reset}  List all containers (alias: ps, ls)
  ${colors.cyan}create${colors.reset}      Create a new container (alias: run)
  ${colors.cyan}exec${colors.reset}        Execute a command in a container
  ${colors.cyan}stop${colors.reset}        Stop a container
  ${colors.cyan}remove${colors.reset}      Remove a container (alias: rm)
  ${colors.cyan}logs${colors.reset}        Get container logs
  ${colors.cyan}health${colors.reset}      Check API health

${colors.bold}SERVERLESS FUNCTION COMMANDS${colors.reset}
  ${colors.cyan}functions${colors.reset}   List all functions (alias: fn, fns)
  ${colors.cyan}fn-create${colors.reset}   Create a new function
  ${colors.cyan}fn-get${colors.reset}      Get function details
  ${colors.cyan}deploy${colors.reset}      Deploy function (warm containers)
  ${colors.cyan}invoke${colors.reset}      Invoke a function
  ${colors.cyan}pause${colors.reset}       Pause function (scale to zero)
  ${colors.cyan}resume${colors.reset}      Resume paused function
  ${colors.cyan}rollback${colors.reset}    Rollback to previous version
  ${colors.cyan}pool${colors.reset}        View pool status/stats

${colors.bold}CONTAINER EXAMPLES${colors.reset}
  quilt config set api-key quilt_sk_xxx
  quilt config set endpoint https://backend.quilt.sh
  quilt containers
  quilt create --name myapp --cmd "node server.js"
  quilt exec myapp "ls -la"
  quilt stop myapp

${colors.bold}FUNCTION EXAMPLES${colors.reset}
  quilt fn-create --name handler --runtime node20 --handler index.handler --code s3://bucket/code.zip
  quilt deploy handler --pool 3
  quilt invoke handler --payload '{"userId": 123}'
  quilt functions
  quilt pool handler
  quilt pause handler

${colors.bold}CONFIGURATION${colors.reset}
  Config file: ${getConfigPath()}
  Environment: QUILT_API_KEY, QUILT_API_BASE_URL
`);
}

async function getClient(): Promise<Quilt> {
  try {
    return await Quilt.connect();
  } catch (err: any) {
    error(`Failed to connect: ${err.message}`);
    log(`\nRun 'quilt config set endpoint <url>' to configure the API endpoint`);
    log(`Run 'quilt config set api-key <key>' to configure your API key`);
    process.exit(1);
  }
}

// Commands
const commands: Record<string, Command> = {
  config: {
    name: 'config',
    description: 'Manage configuration',
    usage: 'quilt config <get|set|show> [key] [value]',
    run: async (args: string[]) => {
      const subcommand = args[0];

      if (!subcommand || subcommand === 'show') {
        const config = loadConfig();
        const resolved = resolveConfig(config);
        log(`${colors.bold}Configuration${colors.reset}`);
        log(`  File: ${getConfigPath()}`);
        log('');
        log(`  ${colors.cyan}api_key:${colors.reset}      ${resolved.apiKey ? '***' + resolved.apiKey.slice(-8) : colors.dim + '(not set)' + colors.reset}`);
        log(`  ${colors.cyan}api_base_url:${colors.reset} ${resolved.apiBaseUrl || colors.dim + '(not set)' + colors.reset}`);
        return;
      }

      if (subcommand === 'set') {
        const key = args[1];
        const value = args[2];

        if (!key || !value) {
          error('Usage: quilt config set <key> <value>');
          log('  Keys: api-key, endpoint');
          process.exit(1);
        }

        const config = loadConfig() || {};

        if (key === 'api-key' || key === 'api_key') {
          config.api_key = value;
          saveConfig(config);
          success(`API key saved to ${getConfigPath()}`);
        } else if (key === 'endpoint' || key === 'api_base_url' || key === 'api-base-url') {
          config.api_base_url = value;
          saveConfig(config);
          success(`API endpoint saved to ${getConfigPath()}`);
        } else {
          error(`Unknown config key: ${key}`);
          log('  Valid keys: api-key, endpoint');
          process.exit(1);
        }
        return;
      }

      if (subcommand === 'get') {
        const key = args[1];
        const config = loadConfig();
        const resolved = resolveConfig(config);

        if (key === 'api-key' || key === 'api_key') {
          log(resolved.apiKey || '');
        } else if (key === 'endpoint' || key === 'api_base_url') {
          log(resolved.apiBaseUrl || '');
        } else {
          error(`Unknown config key: ${key}`);
          process.exit(1);
        }
        return;
      }

      error(`Unknown subcommand: ${subcommand}`);
      log('  Usage: quilt config <get|set|show>');
      process.exit(1);
    },
  },

  health: {
    name: 'health',
    description: 'Check API health',
    usage: 'quilt health',
    run: async () => {
      const quilt = await getClient();
      try {
        const health = await quilt.health();
        log(`${colors.bold}API Health${colors.reset}`);
        log(`  Status: ${health.status === 'healthy' ? colors.green + '● healthy' : colors.red + '● unhealthy'}${colors.reset}`);
        log(`  Containers running: ${health.containers_running}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  containers: {
    name: 'containers',
    description: 'List all containers',
    usage: 'quilt containers [--json]',
    run: async (args: string[]) => {
      const jsonOutput = args.includes('--json');
      const quilt = await getClient();

      try {
        const response = await quilt.list();
        const containers = response.containers || [];

        if (jsonOutput) {
          log(JSON.stringify(containers, null, 2));
        } else {
          if (containers.length === 0) {
            log(`${colors.dim}No containers found${colors.reset}`);
          } else {
            log(`${colors.bold}CONTAINER ID\t\tNAME\t\t\tSTATUS\t\tIP${colors.reset}`);
            for (const c of containers) {
              const stateColor = c.state === 'Running' ? colors.green :
                                c.state === 'Exited' ? colors.dim : colors.yellow;
              log(`${c.container_id.slice(0, 12)}\t\t${c.name || '-'}\t\t\t${stateColor}${c.state}${colors.reset}\t\t${c.ip_address || '-'}`);
            }
          }
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  create: {
    name: 'create',
    description: 'Create a new container',
    usage: 'quilt create --name <name> [--cmd <command>] [--env KEY=VAL] [--memory <mb>] [--cpu <percent>]',
    run: async (args: string[]) => {
      let name: string | undefined;
      let cmd: string[] = [];
      let env: Record<string, string> = {};
      let memoryLimitMb: number | undefined;
      let cpuLimitPercent: number | undefined;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--name' || arg === '-n') {
          name = args[++i];
        } else if (arg === '--cmd' || arg === '-c') {
          const cmdStr = args[++i];
          cmd = ['/bin/sh', '-c', cmdStr];
        } else if (arg === '--env' || arg === '-e') {
          const envStr = args[++i];
          const [key, ...valueParts] = envStr.split('=');
          env[key] = valueParts.join('=');
        } else if (arg === '--memory' || arg === '-m') {
          memoryLimitMb = parseInt(args[++i]);
        } else if (arg === '--cpu') {
          cpuLimitPercent = parseFloat(args[++i]);
        }
      }

      if (!name) {
        error('Container name is required');
        log('  Usage: quilt create --name <name> [--cmd <command>]');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.create({
          name,
          cmd: cmd.length > 0 ? cmd : undefined,
          env: Object.keys(env).length > 0 ? env : undefined,
          memoryLimitMb,
          cpuLimitPercent,
        });

        success(`Container created: ${result.container_id}`);
        if (result.ip_address) {
          log(`  IP: ${result.ip_address}`);
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  exec: {
    name: 'exec',
    description: 'Execute a command in a container',
    usage: 'quilt exec <container> <command>',
    run: async (args: string[]) => {
      const containerName = args[0];
      const command = args.slice(1).join(' ');

      if (!containerName || !command) {
        error('Container name and command are required');
        log('  Usage: quilt exec <container> <command>');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.exec({
          name: containerName,
          cmd: ['/bin/sh', '-c', command],
        });

        if (result.stdout) {
          process.stdout.write(result.stdout);
        }
        if (result.stderr) {
          process.stderr.write(result.stderr);
        }

        await quilt.disconnect();
        process.exit(result.exit_code || 0);
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  stop: {
    name: 'stop',
    description: 'Stop a container',
    usage: 'quilt stop <container>',
    run: async (args: string[]) => {
      const containerName = args[0];

      if (!containerName) {
        error('Container name is required');
        log('  Usage: quilt stop <container>');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        await quilt.stop({ name: containerName });
        success(`Container stopped: ${containerName}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  remove: {
    name: 'remove',
    description: 'Remove a container',
    usage: 'quilt remove <container> [--force]',
    run: async (args: string[]) => {
      const containerName = args[0];
      const force = args.includes('--force') || args.includes('-f');

      if (!containerName) {
        error('Container name is required');
        log('  Usage: quilt remove <container> [--force]');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        await quilt.remove({ name: containerName, force });
        success(`Container removed: ${containerName}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  logs: {
    name: 'logs',
    description: 'Get container logs',
    usage: 'quilt logs <container> [--tail <n>]',
    run: async (args: string[]) => {
      const containerName = args[0];
      let tail: number | undefined;

      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--tail' || args[i] === '-n') {
          tail = parseInt(args[++i]);
        }
      }

      if (!containerName) {
        error('Container name is required');
        log('  Usage: quilt logs <container>');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.logs({ name: containerName, tail });

        if (result.logs && result.logs.length > 0) {
          for (const entry of result.logs) {
            const timestamp = new Date(entry.timestamp * 1000).toISOString();
            log(`${colors.dim}${timestamp}${colors.reset} ${entry.message}`);
          }
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  version: {
    name: 'version',
    description: 'Show version',
    usage: 'quilt version',
    run: async () => {
      log(`quilt-sdk v${VERSION}`);
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVERLESS FUNCTION COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  functions: {
    name: 'functions',
    description: 'List all serverless functions',
    usage: 'quilt functions [--state <state>] [--runtime <runtime>] [--json]',
    run: async (args: string[]) => {
      const jsonOutput = args.includes('--json');
      let state: string | undefined;
      let runtime: string | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--state') state = args[++i];
        if (args[i] === '--runtime') runtime = args[++i];
      }

      const quilt = await getClient();

      try {
        const response = await quilt.listFunctions({ state, runtime });
        const functions = response.functions || [];

        if (jsonOutput) {
          log(JSON.stringify(functions, null, 2));
        } else {
          if (functions.length === 0) {
            log(`${colors.dim}No functions found${colors.reset}`);
          } else {
            log(`${colors.bold}FUNCTION ID         NAME                RUNTIME      STATE${colors.reset}`);
            for (const fn of functions) {
              const stateColor = fn.state === 'active' ? colors.green :
                                fn.state === 'error' ? colors.red :
                                fn.state === 'paused' ? colors.dim : colors.yellow;
              const id = fn.function_id.slice(0, 12).padEnd(20);
              const name = (fn.name || '-').padEnd(20);
              const rt = (fn.runtime || '-').padEnd(13);
              log(`${id}${name}${rt}${stateColor}${fn.state}${colors.reset}`);
            }
          }
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  'fn-create': {
    name: 'fn-create',
    description: 'Create a new serverless function',
    usage: 'quilt fn-create --name <name> --runtime <runtime> --handler <handler> --code <source> [--memory <mb>] [--timeout <sec>]',
    run: async (args: string[]) => {
      let name: string | undefined;
      let runtime: string | undefined;
      let handler: string | undefined;
      let code: string | undefined;
      let memory: number | undefined;
      let timeout: number | undefined;
      let description: string | undefined;
      const env: Record<string, string> = {};

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--name' || arg === '-n') name = args[++i];
        else if (arg === '--runtime' || arg === '-r') runtime = args[++i];
        else if (arg === '--handler' || arg === '-h') handler = args[++i];
        else if (arg === '--code' || arg === '-c') code = args[++i];
        else if (arg === '--memory' || arg === '-m') memory = parseInt(args[++i]);
        else if (arg === '--timeout' || arg === '-t') timeout = parseInt(args[++i]);
        else if (arg === '--description' || arg === '-d') description = args[++i];
        else if (arg === '--env' || arg === '-e') {
          const envStr = args[++i];
          const [key, ...valueParts] = envStr.split('=');
          env[key] = valueParts.join('=');
        }
      }

      if (!name || !runtime || !handler || !code) {
        error('Required: --name, --runtime, --handler, --code');
        log('  Usage: quilt fn-create --name <name> --runtime <runtime> --handler <handler> --code <source>');
        log('  Runtimes: node18, node20, python3.11, python3.12, go1.21, rust1.75');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.createFunction({
          name,
          runtime,
          handler,
          code,
          memory,
          timeout,
          description,
          env: Object.keys(env).length > 0 ? env : undefined,
        });

        success(`Function created: ${result.function_id}`);
        log(`  Name: ${result.name}`);
        log(`  State: ${result.state}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  'fn-get': {
    name: 'fn-get',
    description: 'Get function details',
    usage: 'quilt fn-get <function> [--json]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      const jsonOutput = args.includes('--json');

      if (!functionName) {
        error('Function name is required');
        log('  Usage: quilt fn-get <function>');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.getFunction({ name: functionName });

        if (!result.found || !result.function) {
          error(`Function '${functionName}' not found`);
          process.exit(1);
        }

        const fn = result.function;

        if (jsonOutput) {
          log(JSON.stringify(fn, null, 2));
        } else {
          log(`${colors.bold}Function: ${fn.name}${colors.reset}`);
          log(`  ID: ${fn.function_id}`);
          log(`  State: ${fn.state === 'active' ? colors.green : fn.state === 'error' ? colors.red : colors.yellow}${fn.state}${colors.reset}`);
          log(`  Runtime: ${fn.runtime}`);
          log(`  Handler: ${fn.handler}`);
          log(`  Version: ${fn.version}`);
          log(`  Memory: ${fn.memory_limit_mb}MB`);
          log(`  Timeout: ${fn.timeout_seconds}s`);
          log(`  Invocations: ${fn.invocation_count}`);
          log(`  Errors: ${fn.error_count}`);
          log(`  Avg Duration: ${fn.avg_duration_ms.toFixed(1)}ms`);
          if (fn.description) log(`  Description: ${fn.description}`);
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  deploy: {
    name: 'deploy',
    description: 'Deploy a serverless function',
    usage: 'quilt deploy <function> [--pool <size>]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      let poolSize: number | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--pool' || args[i] === '-p') {
          poolSize = parseInt(args[++i]);
        }
      }

      if (!functionName) {
        error('Function name is required');
        log('  Usage: quilt deploy <function> [--pool <size>]');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.deployFunction({
          name: functionName,
          pool: poolSize,
        });

        success(`Function deployed: ${functionName}`);
        log(`  State: ${result.state}`);
        log(`  Containers warmed: ${result.containers_warmed}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  invoke: {
    name: 'invoke',
    description: 'Invoke a serverless function',
    usage: 'quilt invoke <function> [--payload <json>] [--async]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      let payload: string | undefined;
      let asyncMode = false;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--payload' || args[i] === '-p') {
          payload = args[++i];
        } else if (args[i] === '--async' || args[i] === '-a') {
          asyncMode = true;
        }
      }

      if (!functionName) {
        error('Function name is required');
        log('  Usage: quilt invoke <function> [--payload <json>] [--async]');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.invoke({
          name: functionName,
          payload: payload ? JSON.parse(payload) : undefined,
          async: asyncMode,
        });

        if (asyncMode) {
          success(`Invocation started: ${result.invocation_id}`);
        } else {
          if (result.success) {
            success(`Invocation completed (${result.duration_ms}ms, cold_start: ${result.cold_start})`);
            if (result.output) {
              log(`\n${result.output}`);
            }
          } else {
            error(`Invocation failed: ${result.error_message}`);
          }
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  pause: {
    name: 'pause',
    description: 'Pause a function (scale to zero)',
    usage: 'quilt pause <function> [--drain <seconds>]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      let drainTimeout: number | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--drain' || args[i] === '-d') {
          drainTimeout = parseInt(args[++i]);
        }
      }

      if (!functionName) {
        error('Function name is required');
        log('  Usage: quilt pause <function>');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.pauseFunction({
          name: functionName,
          drain: drainTimeout,
        });
        success(`Function paused: ${functionName}`);
        log(`  Containers drained: ${result.containers_drained}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  resume: {
    name: 'resume',
    description: 'Resume a paused function',
    usage: 'quilt resume <function> [--pool <size>]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      let poolSize: number | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--pool' || args[i] === '-p') {
          poolSize = parseInt(args[++i]);
        }
      }

      if (!functionName) {
        error('Function name is required');
        log('  Usage: quilt resume <function> [--pool <size>]');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.resumeFunction({
          name: functionName,
          pool: poolSize,
        });
        success(`Function resumed: ${functionName}`);
        log(`  State: ${result.state}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  rollback: {
    name: 'rollback',
    description: 'Rollback function to a previous version',
    usage: 'quilt rollback <function> --version <number>',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      let version: number | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--version' || args[i] === '-v') {
          version = parseInt(args[++i]);
        }
      }

      if (!functionName || version === undefined) {
        error('Function name and version are required');
        log('  Usage: quilt rollback <function> --version <number>');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.rollbackFunction({
          name: functionName,
          targetVersion: version,
        });
        success(`Function rolled back to version ${version}`);
        log(`  Current version: ${result.current_version}`);
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  pool: {
    name: 'pool',
    description: 'Get container pool status',
    usage: 'quilt pool [<function>] [--json]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      const jsonOutput = args.includes('--json');

      const quilt = await getClient();

      try {
        if (functionName) {
          const result = await quilt.getPoolStatus({ name: functionName });

          if (jsonOutput) {
            log(JSON.stringify(result, null, 2));
          } else {
            log(`${colors.bold}Pool Status: ${functionName}${colors.reset}`);
            log(`  Ready: ${colors.green}${result.ready_count}${colors.reset}`);
            log(`  Busy: ${colors.yellow}${result.busy_count}${colors.reset}`);

            if (result.containers && result.containers.length > 0) {
              log(`\n${colors.bold}CONTAINER ID        STATE      INVOCATIONS${colors.reset}`);
              for (const c of result.containers) {
                const stateColor = c.state === 'ready' ? colors.green : colors.yellow;
                const id = c.container_id.slice(0, 12).padEnd(20);
                const state = c.state.padEnd(11);
                log(`${id}${stateColor}${state}${colors.reset}${c.invocation_count}/${c.max_invocations}`);
              }
            }
          }
        } else {
          const result = await quilt.getPoolStats();
          const stats = result.stats;

          if (jsonOutput) {
            log(JSON.stringify(stats, null, 2));
          } else {
            log(`${colors.bold}Global Pool Statistics${colors.reset}`);
            log(`  Total containers: ${stats.total_containers}`);
            log(`  Ready: ${colors.green}${stats.ready_containers}${colors.reset}`);
            log(`  Busy: ${colors.yellow}${stats.busy_containers}${colors.reset}`);
            log(`  Functions with pools: ${stats.functions_with_pools}/${stats.total_functions}`);
            log(`  Avg pool size: ${stats.avg_pool_size.toFixed(1)}`);
            log(`\n${colors.bold}Performance${colors.reset}`);
            log(`  Total invocations: ${stats.total_invocations}`);
            log(`  Cold starts: ${stats.cold_starts}`);
            log(`  Warm hits: ${stats.warm_hits}`);
            log(`  Cold start rate: ${colors.cyan}${(stats.cold_start_rate * 100).toFixed(1)}%${colors.reset}`);
          }
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  invocations: {
    name: 'invocations',
    description: 'List function invocations',
    usage: 'quilt invocations <function> [--state <state>] [--limit <n>] [--json]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      const jsonOutput = args.includes('--json');
      let state: string | undefined;
      let limit: number | undefined;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--state') state = args[++i];
        if (args[i] === '--limit' || args[i] === '-n') limit = parseInt(args[++i]);
      }

      if (!functionName) {
        error('Function name is required');
        log('  Usage: quilt invocations <function> [--state <state>] [--limit <n>]');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.listInvocations({
          name: functionName,
          state,
          limit: limit || 20,
        });

        if (jsonOutput) {
          log(JSON.stringify(result.invocations, null, 2));
        } else {
          if (result.invocations.length === 0) {
            log(`${colors.dim}No invocations found${colors.reset}`);
          } else {
            log(`${colors.bold}INVOCATION ID       STATE       DURATION    COLD START${colors.reset}`);
            for (const inv of result.invocations) {
              const stateColor = inv.state === 'completed' ? colors.green :
                                inv.state === 'failed' ? colors.red :
                                inv.state === 'running' ? colors.yellow : colors.dim;
              const id = inv.invocation_id.slice(0, 12).padEnd(20);
              const invState = inv.state.padEnd(12);
              const duration = inv.duration_ms !== undefined ? `${inv.duration_ms}ms`.padEnd(12) : '-'.padEnd(12);
              const coldStart = inv.cold_start ? 'yes' : 'no';
              log(`${id}${stateColor}${invState}${colors.reset}${duration}${coldStart}`);
            }
            log(`\nTotal: ${result.total_count}`);
          }
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },

  versions: {
    name: 'versions',
    description: 'List function versions',
    usage: 'quilt versions <function> [--json]',
    run: async (args: string[]) => {
      const functionName = args.find(a => !a.startsWith('--'));
      const jsonOutput = args.includes('--json');

      if (!functionName) {
        error('Function name is required');
        log('  Usage: quilt versions <function>');
        process.exit(1);
      }

      const quilt = await getClient();

      try {
        const result = await quilt.listVersions({ name: functionName });

        if (jsonOutput) {
          log(JSON.stringify(result.versions, null, 2));
        } else {
          if (result.versions.length === 0) {
            log(`${colors.dim}No versions found${colors.reset}`);
          } else {
            log(`${colors.bold}VERSION    RUNTIME      CODE HASH        CREATED${colors.reset}`);
            for (const v of result.versions) {
              const version = `v${v.version}`.padEnd(11);
              const runtime = v.runtime.padEnd(13);
              const hash = v.code_hash.slice(0, 12).padEnd(17);
              const created = new Date(v.created_at * 1000).toISOString().slice(0, 19);
              log(`${version}${runtime}${hash}${created}`);
            }
          }
        }
        await quilt.disconnect();
      } catch (err: any) {
        error(err.message);
        process.exit(1);
      }
    },
  },
};

// Aliases
const aliases: Record<string, string> = {
  // Container aliases
  ps: 'containers',
  ls: 'containers',
  list: 'containers',
  rm: 'remove',
  run: 'create',
  // Function aliases
  fn: 'functions',
  fns: 'functions',
  // Version/help aliases
  '-v': 'version',
  '--version': 'version',
  '-h': 'help',
  '--help': 'help',
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  let cmdName = args[0];
  const cmdArgs = args.slice(1);

  // Check aliases
  if (aliases[cmdName]) {
    cmdName = aliases[cmdName];
  }

  if (cmdName === 'help') {
    printHelp();
    process.exit(0);
  }

  const cmd = commands[cmdName];

  if (!cmd) {
    error(`Unknown command: ${cmdName}`);
    log(`Run 'quilt --help' for usage`);
    process.exit(1);
  }

  try {
    await cmd.run(cmdArgs);
  } catch (err: any) {
    error(err.message);
    process.exit(1);
  }
}

main();
