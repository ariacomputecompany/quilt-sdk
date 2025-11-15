/**
 * Quilt TypeScript SDK
 *
 * Clean, agent-friendly TypeScript client for the Quilt container runtime via HTTP API.
 *
 * @example
 * ```typescript
 * import Quilt from 'quilt-sdk';
 *
 * const quilt = await Quilt.connect({ apiBaseUrl: 'http://localhost:8080' });
 *
 * // Create container
 * await quilt.create({
 *   cmd: ['/bin/sh', '-c', 'echo hello'],
 *   env: { PORT: '3000' }
 * });
 *
 * // Execute commands
 * const result = await quilt.exec({
 *   name: 'my-app',
 *   cmd: ['ls', '-la']
 * });
 *
 * await quilt.disconnect();
 * ```
 */

// Main export - clean Quilt wrapper
export { default } from './wrapper';
export { default as Quilt } from './wrapper';

// Types and error classes
export * from './types';

// HTTP client (for advanced use)
export { HttpClient, QuiltHttpError } from './http-client';

// TypeScript interfaces (clean, type-safe API)
export * as QuiltTypes from './interfaces';

// OpenAI tool schemas
export * from './tools';

// Legacy tool schemas (MCP)
export * from './schemas';

// Package version
export const VERSION = '2.0.0';
