/**
 * Configuration file loader for Quilt SDK
 *
 * Loads configuration from ~/.quilt/config.json with environment variable overrides.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Quilt configuration file structure
 */
export interface QuiltConfig {
  /**
   * API key for authentication (format: quilt_sk_<32-hex-chars>)
   */
  api_key?: string;

  /**
   * Base URL for the Quilt API (e.g., "https://backend.quilt.sh")
   */
  api_base_url?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout_ms?: number;
}

/**
 * Resolved configuration with environment overrides applied
 */
export interface ResolvedConfig {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: number;
}

/**
 * Get the path to the Quilt config file
 */
export function getConfigPath(): string {
  return path.join(os.homedir(), '.quilt', 'config.json');
}

/**
 * Load configuration from the config file
 *
 * @returns The parsed config or null if file doesn't exist or is invalid
 */
export function loadConfig(): QuiltConfig | null {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as QuiltConfig;
  } catch (e) {
    // Silently fail if config is invalid - user can still pass explicit options
    return null;
  }
}

/**
 * Resolve configuration with environment variable overrides
 *
 * Priority (highest to lowest):
 * 1. Environment variables (QUILT_API_KEY, QUILT_API_BASE_URL)
 * 2. Config file values
 *
 * @param config The loaded config file (can be null)
 * @returns Resolved configuration values
 */
export function resolveConfig(config: QuiltConfig | null): ResolvedConfig {
  return {
    apiKey: process.env.QUILT_API_KEY || config?.api_key,
    apiBaseUrl: process.env.QUILT_API_BASE_URL || config?.api_base_url,
    timeout: config?.timeout_ms,
  };
}

/**
 * Check if a config file exists
 */
export function configExists(): boolean {
  return fs.existsSync(getConfigPath());
}

/**
 * Create the config directory if it doesn't exist
 */
export function ensureConfigDir(): void {
  const configDir = path.join(os.homedir(), '.quilt');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Save configuration to the config file
 *
 * @param config Configuration to save
 */
export function saveConfig(config: QuiltConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600, // Secure permissions - owner read/write only
  });
}
