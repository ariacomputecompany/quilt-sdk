/**
 * Container lifecycle example
 *
 * This example demonstrates:
 * - Creating a container
 * - Starting the container
 * - Getting container status
 * - Executing commands in the container
 * - Getting logs
 * - Stopping and removing the container
 *
 * Note: This example requires a container image tarball.
 * You can create one using: docker export $(docker create alpine) > alpine.tar
 */

const { QuiltClient } = require('../dist/index');
const path = require('path');

async function main() {
  console.log('Quilt SDK Container Lifecycle Example\n');

  // Create client
  const client = new QuiltClient({
    autoStart: true,
    serverAddress: '127.0.0.1:50051'
  });

  let containerId = null;

  try {
    // Connect to server
    console.log('Connecting to Quilt server...');
    await client.connect();
    console.log('✓ Connected\n');

    // Create a container
    console.log('Creating container...');
    const createResult = await client.createContainer({
      image_path: '/path/to/alpine.tar', // Update this path
      name: 'test-container',
      command: ['/bin/sh', '-c', 'echo "Hello from Quilt!" && sleep 30'],
      environment: {
        TEST_VAR: 'test_value'
      },
      async_mode: true,
      enable_network_namespace: true,
      enable_pid_namespace: true
    });

    if (!createResult.success) {
      throw new Error('Failed to create container: ' + createResult.error_message);
    }

    containerId = createResult.container_id;
    console.log('✓ Container created:', containerId);
    console.log();

    // Start the container
    console.log('Starting container...');
    const startResult = await client.startContainer({
      container_id: containerId
    });

    if (!startResult.success) {
      throw new Error('Failed to start container: ' + startResult.error_message);
    }

    console.log('✓ Container started with PID:', startResult.pid);
    console.log();

    // Wait a bit for container to produce output
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get container status
    console.log('Getting container status...');
    const status = await client.getContainerStatus({
      container_id: containerId
    });

    console.log('✓ Status:', {
      status: status.status,
      pid: status.pid,
      ip_address: status.ip_address,
      memory_usage: status.memory_usage_bytes + ' bytes',
      created_at: new Date(Number(status.created_at) * 1000).toISOString()
    });
    console.log();

    // Execute a command in the container
    console.log('Executing command in container...');
    const execResult = await client.execContainer({
      container_id: containerId,
      command: ['cat', '/etc/os-release'],
      capture_output: true
    });

    if (execResult.success) {
      console.log('✓ Command output:');
      console.log(execResult.stdout);
    }

    // Get container logs
    console.log('Getting container logs...');
    const logs = await client.getContainerLogs({
      container_id: containerId
    });

    console.log('✓ Logs:');
    for (const entry of logs.logs || []) {
      console.log(`  [${new Date(Number(entry.timestamp) * 1000).toISOString()}]`, entry.message);
    }
    console.log();

    // Stop the container
    console.log('Stopping container...');
    const stopResult = await client.stopContainer({
      container_id: containerId,
      timeout_seconds: 5
    });

    if (stopResult.success) {
      console.log('✓ Container stopped');
    }
    console.log();

    // Remove the container
    console.log('Removing container...');
    const removeResult = await client.removeContainer({
      container_id: containerId
    });

    if (removeResult.success) {
      console.log('✓ Container removed');
      containerId = null; // Prevent cleanup in finally block
    }
    console.log();

    console.log('Example completed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('gRPC Code:', error.code);
    }
  } finally {
    // Cleanup: try to remove container if it still exists
    if (containerId) {
      try {
        console.log('\nCleaning up container...');
        await client.removeContainer({
          container_id: containerId,
          force: true
        });
        console.log('✓ Container cleaned up');
      } catch (err) {
        console.error('Cleanup error:', err.message);
      }
    }

    // Disconnect
    console.log('\nDisconnecting...');
    await client.disconnect();
    console.log('✓ Disconnected');
  }
}

main().catch(console.error);
