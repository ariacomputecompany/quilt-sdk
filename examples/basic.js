/**
 * Basic example of using the Quilt SDK
 *
 * This example demonstrates:
 * - Connecting to the Quilt HTTP API
 * - Checking health
 * - Getting system information
 */

const Quilt = require('../dist/index').default;

async function main() {
  console.log('Quilt SDK Basic Example\n');

  // Create client with HTTP API endpoint
  const quilt = await Quilt.connect({
    apiBaseUrl: 'http://localhost:8080'
  });

  try {
    console.log('✓ Connected successfully\n');

    // Get health status
    console.log('Getting health status...');
    const health = await quilt.health();
    console.log('✓ Health:', {
      status: health.status,
      uptime: health.uptime_seconds + 's',
      containers: health.containers_running
    });
    console.log();

    // Get system info
    console.log('Getting system information...');
    const info = await quilt.getSystemInfo();
    console.log('✓ System Info:', {
      version: info.version,
      os: info.os,
      architecture: info.architecture
    });
    console.log();

    // List volumes
    console.log('Listing volumes...');
    const volumes = await quilt.listVolumes();
    console.log('✓ Found', volumes.volumes?.length || 0, 'volumes');
    console.log();

    // List network allocations
    console.log('Listing network allocations...');
    const allocations = await quilt.listNetworkAllocations();
    console.log('✓ Found', allocations.allocations?.length || 0, 'network allocations');
    console.log();

    console.log('Example completed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.statusCode) {
      console.error('HTTP Status Code:', error.statusCode);
    }
    process.exit(1);
  } finally {
    // Disconnect and cleanup
    console.log('\nDisconnecting...');
    await quilt.disconnect();
    console.log('✓ Disconnected');
  }
}

main().catch(console.error);
