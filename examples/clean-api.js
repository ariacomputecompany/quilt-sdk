"use strict";
/**
 * Clean API Example - TypeScript
 *
 * Demonstrates the streamlined Quilt SDK API optimized for agent use.
 * Features short property names, smart defaults, and single import.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../dist/index"));
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Quilt SDK - Clean API Example');
    console.log('═══════════════════════════════════════════════════════\n');
    // ═══════════════════════════════════════════════════════════════
    // 1. SIMPLE INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    console.log('1️⃣  INITIALIZATION (Single Line)\n');
    const quilt = await index_1.default.connect({ autoStart: true });
    console.log('✓ Connected\n');
    // ═══════════════════════════════════════════════════════════════
    // 2. HEALTH CHECK - Simple method
    // ═══════════════════════════════════════════════════════════════
    console.log('2️⃣  HEALTH CHECK\n');
    const health = await quilt.health();
    console.log('Health:', {
        healthy: health.healthy,
        status: health.status,
        uptime: health.uptime_seconds + 's',
        containers: `${health.containers_running}/${health.containers_total}`
    });
    console.log();
    // ═══════════════════════════════════════════════════════════════
    // 3. SYSTEM INFO
    // ═══════════════════════════════════════════════════════════════
    console.log('3️⃣  SYSTEM INFO\n');
    const info = await quilt.info();
    console.log('System:', {
        version: info.version,
        runtime: info.runtime
    });
    console.log();
    // ═══════════════════════════════════════════════════════════════
    // 4. SHORT PROPERTY NAMES - Clean and idiomatic
    // ═══════════════════════════════════════════════════════════════
    console.log('4️⃣  SHORT PROPERTY NAMES\n');
    console.log('Container creation with clean syntax:');
    console.log(`
  await quilt.create({
    image: '/path/to/alpine.tar',  // Short: image (not image_path)
    cmd: ['node', 'app.js'],        // Short: cmd (not command)
    env: { PORT: '3000' },          // Short: env (not environment)
    workdir: '/app',                // Short: workdir (not working_directory)
    memory: 512,                    // Short: memory (not memory_limit_mb)
    cpu: 50,                        // Short: cpu (not cpu_limit_percent)
    name: 'my-app'
  });

  // OR use camelCase - both work!
  await quilt.create({
    imagePath: '/path/to/alpine.tar',
    workingDirectory: '/app',
    memoryLimitMb: 512
  });

  // All normalize to canonical snake_case internally
  `);
    // ═══════════════════════════════════════════════════════════════
    // 5. SMART DEFAULTS - Minimal configuration
    // ═══════════════════════════════════════════════════════════════
    console.log('5️⃣  SMART DEFAULTS (Async by Default)\n');
    console.log('Defaults applied automatically:');
    console.log(`
  // These are set automatically (no need to specify):
  - async_mode: true              (non-blocking for agents)
  - enable_pid_namespace: true    (isolation)
  - enable_mount_namespace: true  (isolation)
  - enable_network_namespace: true (isolation)
  - capture_output: true          (for exec commands)
  - timeout_seconds: 10           (for stop operations)

  // Minimal container creation:
  await quilt.create({
    image: '/path/to/alpine.tar'  // Only image is required!
  });
  `);
    // ═══════════════════════════════════════════════════════════════
    // 6. VOLUMES - Clean CRUD operations
    // ═══════════════════════════════════════════════════════════════
    console.log('6️⃣  VOLUMES (Clean CRUD)\n');
    const volumes = await quilt.listVolumes({});
    console.log(`Listed ${volumes.volumes?.length || 0} volumes\n`);
    console.log('Volume operations:');
    console.log(`
  // Create
  await quilt.createVolume({ name: 'data', labels: { app: 'myapp' } });

  // List with filters
  await quilt.listVolumes({ filters: { app: 'myapp' } });

  // Inspect
  const vol = await quilt.inspectVolume({ name: 'data' });

  // Remove
  await quilt.removeVolume({ name: 'data', force: false });
  `);
    // ═══════════════════================================================================
    // 7. FLEXIBLE IDENTIFICATION - ID or name
    // ═══════════════════════════════════════════════════════════════
    console.log('7️⃣  FLEXIBLE IDENTIFICATION\n');
    console.log('Use ID or name interchangeably:');
    console.log(`
  // By ID
  await quilt.start({ id: 'abc123' });
  await quilt.stop({ id: 'abc123' });
  await quilt.status({ id: 'abc123' });

  // By name
  await quilt.start({ name: 'my-app' });
  await quilt.stop({ name: 'my-app' });
  await quilt.status({ name: 'my-app' });

  // Execute commands
  await quilt.exec({ id: 'abc123', cmd: ['ls', '-la'] });
  await quilt.exec({ name: 'my-app', cmd: ['npm', 'test'] });
  `);
    // ═══════════════════════════════════════════════════════════════
    // 8. METRICS & MONITORING
    // ═══════════════════════════════════════════════════════════════
    console.log('8️⃣  METRICS & MONITORING\n');
    const metrics = await quilt.metrics({ include: true });
    console.log('Metrics:', {
        containerMetrics: metrics.container_metrics?.length || 0,
        systemMetrics: metrics.system_metrics ? 'available' : 'not available'
    });
    if (metrics.system_metrics) {
        console.log('System:', {
            memory: `${metrics.system_metrics.memory_used_mb}/${metrics.system_metrics.memory_total_mb}MB`,
            cpus: metrics.system_metrics.cpu_count,
            load: metrics.system_metrics.load_average
        });
    }
    console.log();
    // ═══════════════════════════════════════════════════════════════
    // 9. NETWORK OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('9️⃣  NETWORK OPERATIONS\n');
    const networks = await quilt.listNetworks();
    console.log(`Network allocations: ${networks.allocations?.length || 0}`);
    const dns = await quilt.listDns();
    console.log(`DNS entries: ${dns.entries?.length || 0}\n`);
    // ═══════════════════════════════════════════════════════════════
    // 10. CLEANUP OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('🔟 CLEANUP OPERATIONS\n');
    const cleanup = await quilt.listCleanup();
    console.log(`Cleanup tasks: ${cleanup.tasks?.length || 0}\n`);
    console.log('Cleanup operations:');
    console.log(`
  // Get cleanup status
  await quilt.cleanup({ id: 'abc123' });

  // List all cleanup tasks
  await quilt.listCleanup();

  // Force cleanup
  await quilt.forceCleanup({ id: 'abc123' });

  // Network cleanup
  await quilt.networkCleanup();
  `);
    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CLEAN API HIGHLIGHTS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`
  ✅ Single import: import Quilt from 'quilt-sdk'
  ✅ One-line connect: await Quilt.connect()
  ✅ Short property names: image, cmd, env, workdir, memory, cpu
  ✅ CamelCase support: imagePath, workingDirectory, etc.
  ✅ Smart defaults: async_mode: true, namespaces enabled
  ✅ Flexible identification: use id or name
  ✅ Minimal configuration: only image required
  ✅ Full type safety: no 'any' types
  ✅ Clean method names: create, start, stop, status, logs, exec
  ✅ Agent-optimized: non-blocking operations
  `);
    console.log('Disconnecting...');
    await quilt.disconnect();
    console.log('✓ Disconnected\n');
}
main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
