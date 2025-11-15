"use strict";
/**
 * Minimal Agent Example - TypeScript
 *
 * Demonstrates the absolute minimal configuration needed for agent use.
 * No image paths required - just specify what to run!
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../dist/index"));
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Quilt SDK - Minimal Agent Example');
    console.log('  (No Image Paths Required!)');
    console.log('═══════════════════════════════════════════════════════\n');
    // ═══════════════════════════════════════════════════════════════
    // 1. CONNECT - One line
    // ═══════════════════════════════════════════════════════════════
    console.log('1️⃣  CONNECT\n');
    const quilt = await index_1.default.connect();
    console.log('✓ Connected\n');
    // ═══════════════════════════════════════════════════════════════
    // 2. CREATE CONTAINERS - No image path needed!
    // ═══════════════════════════════════════════════════════════════
    console.log('2️⃣  CREATE CONTAINERS (Minimal Configuration)\n');
    console.log('Example 1: Just a command');
    console.log(`
  await quilt.create({
    cmd: ['node', 'app.js']
  });
  // That's it! Image is handled automatically
  `);
    console.log('Example 2: With environment variables');
    console.log(`
  await quilt.create({
    cmd: ['python', 'server.py'],
    env: {
      PORT: '8000',
      DEBUG: 'true'
    }
  });
  `);
    console.log('Example 3: With resource limits');
    console.log(`
  await quilt.create({
    cmd: ['npm', 'start'],
    memory: 512,     // 512 MB
    cpu: 50,         // 50%
    name: 'web-app'
  });
  `);
    console.log('Example 4: With working directory');
    console.log(`
  await quilt.create({
    cmd: ['./run.sh'],
    workdir: '/opt/app',
    env: { MODE: 'production' }
  });
  `);
    console.log('Example 5: Truly minimal - empty container');
    console.log(`
  await quilt.create({});
  // Creates container with all defaults!
  `);
    // ═══════════════════════════════════════════════════════════════
    // 3. WHAT'S APPLIED AUTOMATICALLY
    // ═══════════════════════════════════════════════════════════════
    console.log('3️⃣  AUTOMATIC DEFAULTS\n');
    console.log('Every container gets these automatically:');
    console.log(`
  ✅ image_path: '/var/lib/quilt/images/default.tar'
  ✅ async_mode: true (non-blocking)
  ✅ enable_pid_namespace: true
  ✅ enable_mount_namespace: true
  ✅ enable_uts_namespace: true
  ✅ enable_ipc_namespace: true
  ✅ enable_network_namespace: true

  Agents don't need to worry about:
  - Image paths
  - Namespace configuration
  - Async vs sync mode
  - Isolation settings
  `);
    // ═══════════════════════════════════════════════════════════════
    // 4. AGENT WORKFLOW EXAMPLE
    // ═══════════════════════════════════════════════════════════════
    console.log('4️⃣  TYPICAL AGENT WORKFLOW\n');
    console.log('Step 1: Create container with task');
    console.log(`
  const result = await quilt.create({
    cmd: ['python', 'analyze.py', '--data', 'input.csv'],
    env: { TASK_ID: '123' },
    name: 'analyzer'
  });
  console.log('Container ID:', result.container_id);
  `);
    console.log('Step 2: Monitor execution (async mode = non-blocking)');
    console.log(`
  // Agent can immediately do other work
  // Container runs in background

  // Check status when needed
  const status = await quilt.status({ name: 'analyzer' });
  if (status.status === 1) {  // RUNNING
    console.log('Still running...');
  } else if (status.status === 2) {  // EXITED
    console.log('Finished with code:', status.exit_code);
  }
  `);
    console.log('Step 3: Get results');
    console.log(`
  const logs = await quilt.logs({ name: 'analyzer' });
  console.log('Output:', logs.logs);
  `);
    console.log('Step 4: Cleanup');
    console.log(`
  await quilt.remove({ name: 'analyzer' });
  `);
    // ═══════════════════════════════════════════════════════════════
    // 5. AGENT TOOLS FORMAT
    // ═══════════════════════════════════════════════════════════════
    console.log('5️⃣  FOR AI AGENTS (OpenAI Function Calling)\n');
    console.log('The create_container tool signature:');
    console.log(`
  {
    name: 'create_container',
    description: 'Create and start a new container. Uses internal default image automatically.',
    parameters: {
      cmd: { type: 'array', description: 'Command to run' },
      env: { type: 'object', description: 'Environment variables' },
      memory: { type: 'number', description: 'Memory limit in MB' },
      cpu: { type: 'number', description: 'CPU limit percentage' },
      name: { type: 'string', description: 'Container name' }
    }
    // Note: NO required parameters!
  }

  Example agent call:
  {
    "cmd": ["node", "process.js"],
    "env": { "INPUT": "data.json" }
  }
  `);
    // ═══════════════================================================================
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════');
    console.log('  SUMMARY: ULTRA-MINIMAL FOR AGENTS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`
  🎯 MINIMUM NEEDED TO CREATE CONTAINER:
     await quilt.create({})

  📦 IMAGE: Handled automatically
  ⚡ MODE: Async by default (non-blocking)
  🔒 ISOLATION: All namespaces enabled
  🚀 AGENT-READY: Zero configuration overhead

  Agents can focus on WHAT to run, not HOW to run it.
  `);
    console.log('Disconnecting...');
    await quilt.disconnect();
    console.log('✓ Done\n');
}
main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
