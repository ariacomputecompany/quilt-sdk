/**
 * Serverless Functions Example
 *
 * Demonstrates the Quilt SDK serverless function API with full lifecycle
 * management, invocation, and pool monitoring.
 */

import Quilt from '../dist/index';

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Quilt SDK - Serverless Functions Example');
  console.log('═══════════════════════════════════════════════════════\n');

  const quilt = await Quilt.connect();

  // ═══════════════════════════════════════════════════════════════
  // 1. CREATE FUNCTION
  // ═══════════════════════════════════════════════════════════════
  console.log('1. CREATE FUNCTION\n');

  const created = await quilt.createFunction({
    name: 'hello-world',
    runtime: 'node20',
    handler: 'index.handler',
    code: 's3://my-bucket/hello-world.zip',
    memory: 256,
    timeout: 30,
    env: { LOG_LEVEL: 'info' },
    description: 'A simple hello world function',
  });

  console.log(`Created: ${created.function_id}`);
  console.log(`State: ${created.state}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 2. DEPLOY FUNCTION
  // ═══════════════════════════════════════════════════════════════
  console.log('2. DEPLOY FUNCTION\n');

  const deployed = await quilt.deployFunction({
    name: 'hello-world',
    pool: 2,  // Pre-warm 2 containers
  });

  console.log(`State: ${deployed.state}`);
  console.log(`Containers warmed: ${deployed.containers_warmed}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 3. INVOKE FUNCTION (Synchronous)
  // ═══════════════════════════════════════════════════════════════
  console.log('3. INVOKE FUNCTION (Sync)\n');

  const result = await quilt.invoke({
    name: 'hello-world',
    payload: { name: 'Quilt' },
  });

  console.log(`Success: ${result.success}`);
  console.log(`Cold start: ${result.cold_start}`);
  console.log(`Duration: ${result.duration_ms}ms`);
  console.log(`Output: ${result.output}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 4. INVOKE FUNCTION (Asynchronous)
  // ═══════════════════════════════════════════════════════════════
  console.log('4. INVOKE FUNCTION (Async)\n');

  const asyncResult = await quilt.invoke({
    name: 'hello-world',
    payload: { name: 'Async User' },
    async: true,  // Non-blocking
  });

  console.log(`Invocation ID: ${asyncResult.invocation_id}`);
  console.log('(Running in background)\n');

  // ═══════════════════════════════════════════════════════════════
  // 5. CHECK POOL STATUS
  // ═══════════════════════════════════════════════════════════════
  console.log('5. POOL STATUS\n');

  const pool = await quilt.getPoolStatus({ name: 'hello-world' });
  console.log(`Ready containers: ${pool.ready_count}`);
  console.log(`Busy containers: ${pool.busy_count}`);

  if (pool.containers.length > 0) {
    console.log('\nContainers:');
    for (const c of pool.containers) {
      console.log(`  ${c.container_id.slice(0, 8)}: ${c.state} (${c.invocation_count}/${c.max_invocations} invocations)`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // 6. LIST INVOCATIONS
  // ═══════════════════════════════════════════════════════════════
  console.log('6. LIST INVOCATIONS\n');

  const invocations = await quilt.listInvocations({
    name: 'hello-world',
    limit: 5,
  });

  console.log(`Total invocations: ${invocations.total_count}`);
  for (const inv of invocations.invocations) {
    console.log(`  ${inv.invocation_id.slice(0, 8)}: ${inv.state} (${inv.duration_ms || '?'}ms, cold: ${inv.cold_start})`);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // 7. GET FUNCTION DETAILS
  // ═══════════════════════════════════════════════════════════════
  console.log('7. GET FUNCTION DETAILS\n');

  const details = await quilt.getFunction({ name: 'hello-world' });
  if (details.found && details.function) {
    const fn = details.function;
    console.log(`Name: ${fn.name}`);
    console.log(`State: ${fn.state}`);
    console.log(`Runtime: ${fn.runtime}`);
    console.log(`Handler: ${fn.handler}`);
    console.log(`Version: ${fn.version}`);
    console.log(`Invocations: ${fn.invocation_count}`);
    console.log(`Errors: ${fn.error_count}`);
    console.log(`Avg Duration: ${fn.avg_duration_ms.toFixed(1)}ms`);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // 8. PAUSE & RESUME
  // ═══════════════════════════════════════════════════════════════
  console.log('8. PAUSE & RESUME\n');

  const paused = await quilt.pauseFunction({ name: 'hello-world' });
  console.log(`Function paused (${paused.containers_drained} containers drained)`);

  const resumed = await quilt.resumeFunction({ name: 'hello-world', pool: 1 });
  console.log(`Function resumed (state: ${resumed.state})\n`);

  // ═══════════════════════════════════════════════════════════════
  // 9. VERSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  console.log('9. VERSION MANAGEMENT\n');

  // Update function to create a new version
  await quilt.updateFunction({
    name: 'hello-world',
    code: 's3://my-bucket/hello-world-v2.zip',
  });
  console.log('Function updated to v2');

  const versions = await quilt.listVersions({ name: 'hello-world' });
  console.log(`Total versions: ${versions.versions.length}`);

  for (const v of versions.versions) {
    console.log(`  v${v.version}: ${v.code_hash.slice(0, 8)}... (${new Date(v.created_at * 1000).toISOString().slice(0, 19)})`);
  }

  // Rollback to version 1
  const rollback = await quilt.rollbackFunction({
    name: 'hello-world',
    targetVersion: 1,
  });
  console.log(`Rolled back to version ${rollback.current_version}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 10. GLOBAL POOL STATS
  // ═══════════════════════════════════════════════════════════════
  console.log('10. GLOBAL POOL STATS\n');

  const stats = await quilt.getPoolStats();
  console.log(`Total containers: ${stats.stats.total_containers}`);
  console.log(`Ready: ${stats.stats.ready_containers}`);
  console.log(`Busy: ${stats.stats.busy_containers}`);
  console.log(`Functions with pools: ${stats.stats.functions_with_pools}/${stats.stats.total_functions}`);
  console.log(`Total invocations: ${stats.stats.total_invocations}`);
  console.log(`Cold start rate: ${(stats.stats.cold_start_rate * 100).toFixed(1)}%\n`);

  // ═══════════════════════════════════════════════════════════════
  // 11. CLEANUP
  // ═══════════════════════════════════════════════════════════════
  console.log('11. CLEANUP\n');

  await quilt.deleteFunction({ name: 'hello-world', force: true });
  console.log('Function deleted\n');

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SERVERLESS FUNCTIONS HIGHLIGHTS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`
  SDK Methods:
    quilt.createFunction()     - Create a new function
    quilt.getFunction()        - Get function details
    quilt.listFunctions()      - List all functions
    quilt.updateFunction()     - Update function config
    quilt.deleteFunction()     - Delete function
    quilt.deployFunction()     - Deploy (warm containers)
    quilt.pauseFunction()      - Scale to zero
    quilt.resumeFunction()     - Resume from pause
    quilt.invoke()             - Invoke function
    quilt.listInvocations()    - List invocations
    quilt.getInvocation()      - Get invocation result
    quilt.listVersions()       - List versions
    quilt.rollbackFunction()   - Rollback version
    quilt.getPoolStatus()      - Get pool status
    quilt.getPoolStats()       - Global pool metrics

  Property Aliases (all work):
    name: 'handler'            -> function_name: 'handler'
    code: 's3://...'           -> code_source: 's3://...'
    timeout: 60                -> timeout_seconds: 60
    memory: 256                -> memory_limit_mb: 256
    pool: 3                    -> pool_size: 3
    async: true                -> async_mode: true

  Smart Defaults:
    timeout_seconds: 300       (5 minutes)
    memory_limit_mb: 128       (minimal)
    async_mode: false          (sync invoke)
    pool_size: 1               (one warm container)
  `);

  await quilt.disconnect();
  console.log('Disconnected\n');
}

main().catch((error: Error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
