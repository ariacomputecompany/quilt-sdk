#!/usr/bin/env node
/**
 * Quilt CLI
 *
 * Command-line interface for the Quilt container runtime.
 */

import Quilt from './wrapper';
import { loadConfig, saveConfig, getConfigPath, resolveConfig } from './config';
import type { QuiltConfig } from './config';

const VERSION = '2.0.0';

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

${colors.bold}COMMANDS${colors.reset}
  ${colors.cyan}config${colors.reset}      Manage configuration (api-key, endpoint)
  ${colors.cyan}containers${colors.reset}  List all containers
  ${colors.cyan}create${colors.reset}      Create a new container
  ${colors.cyan}exec${colors.reset}        Execute a command in a container
  ${colors.cyan}stop${colors.reset}        Stop a container
  ${colors.cyan}remove${colors.reset}      Remove a container
  ${colors.cyan}logs${colors.reset}        Get container logs
  ${colors.cyan}health${colors.reset}      Check API health

${colors.bold}EXAMPLES${colors.reset}
  quilt config set api-key quilt_sk_xxx
  quilt config set endpoint https://backend.quilt.sh
  quilt containers
  quilt create --name myapp --cmd "node server.js"
  quilt exec myapp "ls -la"
  quilt stop myapp

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
};

// Aliases
const aliases: Record<string, string> = {
  ps: 'containers',
  ls: 'containers',
  list: 'containers',
  rm: 'remove',
  run: 'create',
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
