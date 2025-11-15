"use strict";
/**
 * TypeScript Example - Full Type Safety Demonstration
 *
 * This example showcases the clean, intuitive, and FULLY TYPE-SAFE API
 * of the Quilt SDK when used in TypeScript.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../dist/index");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var client, health, _i, _a, check, systemInfo, createRequest, metricsRequest, metrics, sys, volumesResponse, _b, _c, volume, allocations, _d, _e, alloc, dnsEntries;
        var _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('  Quilt SDK - TypeScript Type Safety Demonstration');
                    console.log('═══════════════════════════════════════════════════════\n');
                    // ═══════════════════════════════════════════════════════════════
                    // 1. CLIENT INITIALIZATION - Fully typed options
                    // ═══════════════════════════════════════════════════════════════
                    console.log('1️⃣  CLIENT INITIALIZATION (Fully Typed)\n');
                    client = new index_1.QuiltClient({
                        autoStart: true, // boolean
                        serverAddress: '127.0.0.1:50051', // string
                        startupTimeoutMs: 5000, // number
                        shutdownTimeoutMs: 3000 // number
                    });
                    return [4 /*yield*/, client.connect()];
                case 1:
                    _k.sent();
                    console.log('✓ Client connected with type-safe options\n');
                    // ═══════════════════════════════════════════════════════════════
                    // 2. HEALTH CHECK - Typed response
                    // ═══════════════════════════════════════════════════════════════
                    console.log('2️⃣  HEALTH CHECK (Typed Response)\n');
                    return [4 /*yield*/, client.getHealth()];
                case 2:
                    health = _k.sent();
                    // TypeScript knows all these properties exist and their types!
                    console.log('Health Status:', {
                        healthy: health.healthy, // boolean
                        status: health.status, // string
                        uptime: health.uptime_seconds, // number
                        containers_running: health.containers_running, // number
                        containers_total: health.containers_total, // number
                        checks: health.checks // HealthCheck[]
                    });
                    // TypeScript autocomplete works for nested objects
                    if (health.checks && health.checks.length > 0) {
                        for (_i = 0, _a = health.checks; _i < _a.length; _i++) {
                            check = _a[_i];
                            console.log("  - ".concat(check.name, ": ").concat(check.healthy ? '✓' : '✗', " (").concat(check.duration_ms, "ms)"));
                        }
                    }
                    console.log();
                    // ═══════════════════════════════════════════════════════════════
                    // 3. SYSTEM INFO - Enum types
                    // ═══════════════════════════════════════════════════════════════
                    console.log('3️⃣  SYSTEM INFO (With Enum Types)\n');
                    return [4 /*yield*/, client.getSystemInfo()];
                case 3:
                    systemInfo = _k.sent();
                    console.log('System:', {
                        version: systemInfo.version, // string
                        runtime: systemInfo.runtime, // string
                        start_time: systemInfo.start_time, // number
                        features: systemInfo.features, // Record<string, string>
                        limits: systemInfo.limits // Record<string, string>
                    });
                    console.log();
                    // ═══════════════════════════════════════════════════════════════
                    // 4. CONTAINER CREATION - Rich typed request
                    // ═══════════════════════════════════════════════════════════════
                    console.log('4️⃣  CONTAINER CREATION (Fully Typed Request)\n');
                    createRequest = {
                        image_path: '/path/to/alpine.tar',
                        name: 'typescript-demo',
                        command: ['node', 'server.js'], // string[]
                        working_directory: '/app', // string
                        // Typed object
                        environment: {
                            NODE_ENV: 'production',
                            PORT: '3000'
                        },
                        // Numbers with proper types
                        memory_limit_mb: 512, // number
                        cpu_limit_percent: 50.0, // number
                        // Boolean flags
                        enable_pid_namespace: true, // boolean
                        enable_network_namespace: true, // boolean
                        async_mode: true, // boolean
                        // Array of typed objects
                        mounts: [
                            {
                                source: '/host/data',
                                target: '/app/data',
                                type: index_1.QuiltTypes.MountType.BIND, // Enum!
                                readonly: false,
                                options: { 'bind-propagation': 'shared' }
                            }
                        ],
                        setup_commands: ['npm: express', 'pip: requests']
                    };
                    console.log('Request validated by TypeScript at compile time ✓');
                    console.log('(Skipping actual creation for demo)\n');
                    // Response is also fully typed
                    // const result: QuiltTypes.CreateContainerResponse = await client.createContainer(createRequest);
                    // TypeScript knows: result.container_id (string), result.success (boolean), etc.
                    // ═══════════════════════════════════════════════════════════════
                    // 5. METRICS - Complex nested types
                    // ═══════════════════════════════════════════════════════════════
                    console.log('5️⃣  METRICS (Complex Nested Types)\n');
                    metricsRequest = {
                        include_system: true,
                        // container_id is optional, TypeScript knows this
                    };
                    return [4 /*yield*/, client.getMetrics(metricsRequest)];
                case 4:
                    metrics = _k.sent();
                    // TypeScript knows metrics.container_metrics is ContainerMetric[]
                    console.log("Container metrics: ".concat(((_f = metrics.container_metrics) === null || _f === void 0 ? void 0 : _f.length) || 0, " entries"));
                    // All properties are typed, autocomplete works perfectly
                    if (metrics.system_metrics) {
                        sys = metrics.system_metrics;
                        console.log('System Metrics:', {
                            memory: "".concat(sys.memory_used_mb, "/").concat(sys.memory_total_mb, "MB"),
                            cpus: sys.cpu_count,
                            load: sys.load_average,
                            containers: {
                                total: sys.containers_total,
                                running: sys.containers_running,
                                stopped: sys.containers_stopped
                            }
                        });
                    }
                    console.log();
                    // ═══════════════════════════════════════════════════════════════
                    // 6. VOLUMES - CRUD with full type safety
                    // ═══════════════════════════════════════════════════════════════
                    console.log('6️⃣  VOLUMES (Type-Safe CRUD)\n');
                    return [4 /*yield*/, client.listVolumes({
                            filters: { app: 'myapp' } // Record<string, string>
                        })];
                case 5:
                    volumesResponse = _k.sent();
                    console.log("Found ".concat(((_g = volumesResponse.volumes) === null || _g === void 0 ? void 0 : _g.length) || 0, " volumes"));
                    // Each volume is fully typed
                    for (_b = 0, _c = volumesResponse.volumes || []; _b < _c.length; _b++) {
                        volume = _c[_b];
                        // TypeScript knows: volume.name, volume.driver, volume.mount_point, etc.
                        console.log("  - ".concat(volume.name, ": ").concat(volume.mount_point));
                    }
                    console.log();
                    // ═══════════════════════════════════════════════════════════════
                    // 7. STREAMING - AsyncIterator with typed events
                    // ═══════════════════════════════════════════════════════════════
                    console.log('7️⃣  STREAMING (Typed AsyncIterator)\n');
                    console.log('Event streaming pattern:');
                    console.log("\n  // Request is typed\n  const request: QuiltTypes.StreamEventsRequest = {\n    container_ids: ['abc123'],\n    event_types: ['started', 'stopped']\n  };\n\n  // Events are typed as ContainerEvent\n  for await (const event of client.streamEvents(request)) {\n    // TypeScript knows all properties:\n    console.log({\n      type: event.event_type,          // string\n      container: event.container_id,    // string\n      timestamp: event.timestamp,       // number\n      attributes: event.attributes      // Record<string, string>\n    });\n  }\n  ");
                    // ═══════════════════════════════════════════════════════════════
                    // 8. NETWORK OPERATIONS - Nested object types
                    // ═══════════════════════════════════════════════════════════════
                    console.log('8️⃣  NETWORK OPERATIONS (Nested Types)\n');
                    return [4 /*yield*/, client.listNetworkAllocations({})];
                case 6:
                    allocations = _k.sent();
                    console.log("Network allocations: ".concat(((_h = allocations.allocations) === null || _h === void 0 ? void 0 : _h.length) || 0));
                    // Each allocation is a NetworkAllocation type
                    for (_d = 0, _e = allocations.allocations || []; _d < _e.length; _d++) {
                        alloc = _e[_d];
                        console.log("  Container ".concat(alloc.container_id, ": ").concat(alloc.ip_address));
                    }
                    return [4 /*yield*/, client.listDnsEntries({})];
                case 7:
                    dnsEntries = _k.sent();
                    console.log("DNS entries: ".concat(((_j = dnsEntries.entries) === null || _j === void 0 ? void 0 : _j.length) || 0));
                    console.log();
                    // Example of setting network config with full type safety
                    console.log('Network config type safety:');
                    console.log("\n  const networkConfig: QuiltTypes.ContainerNetworkConfig = {\n    ip_address: '10.42.0.100',\n    bridge_interface: 'quilt0',\n    veth_host: 'veth0',\n    veth_container: 'eth0',\n    setup_completed: true,\n    status: 'active'\n  };\n\n  const setNetworkRequest: QuiltTypes.SetContainerNetworkRequest = {\n    container_id: 'abc123',\n    network_config: networkConfig\n  };\n\n  const response: QuiltTypes.SetContainerNetworkResponse =\n    await client.setContainerNetwork(setNetworkRequest);\n  ");
                    // ═══════════════════════════════════════════════════════════════
                    // 9. ERROR HANDLING - Typed error classes
                    // ═══════════════════════════════════════════════════════════════
                    console.log('9️⃣  ERROR HANDLING (Typed Errors)\n');
                    console.log('Type-safe error handling:');
                    console.log("\n  try {\n    await client.createContainer({\n      image_path: '/nonexistent.tar'\n    });\n  } catch (error) {\n    if (error instanceof QuiltConnectionError) {\n      // TypeScript knows: error.serverAddress\n      console.error('Connection failed:', error.serverAddress);\n    }\n    else if (error instanceof QuiltRPCError) {\n      // TypeScript knows: error.method, error.code, error.details\n      console.error('RPC error:', {\n        method: error.method,\n        code: error.code,\n        details: error.details\n      });\n    }\n    else if (error instanceof QuiltServerError) {\n      // TypeScript knows: error.message\n      console.error('Server error:', error.message);\n    }\n  }\n  ");
                    // ═══════════════════════════════════════════════════════════════
                    // 10. TYPE EXPORTS - All types are accessible
                    // ═══════════════════════════════════════════════════════════════
                    console.log('🔟 TYPE EXPORTS (All Types Accessible)\n');
                    console.log('Available type exports:');
                    console.log("\n  // Request/Response types for all 31 methods\n  import { QuiltTypes } from 'quilt-sdk';\n\n  QuiltTypes.CreateContainerRequest\n  QuiltTypes.CreateContainerResponse\n  QuiltTypes.GetContainerStatusRequest\n  QuiltTypes.GetContainerStatusResponse\n  // ... all 31 methods with request/response types\n\n  // Common types\n  QuiltTypes.Mount\n  QuiltTypes.Volume\n  QuiltTypes.ContainerMetric\n  QuiltTypes.SystemMetrics\n  QuiltTypes.NetworkAllocation\n  QuiltTypes.ContainerNetworkConfig\n  QuiltTypes.ContainerEvent\n  // ... and more\n\n  // Enums\n  QuiltTypes.ContainerStatus\n  QuiltTypes.MountType\n\n  // Error classes\n  import {\n    QuiltConnectionError,\n    QuiltRPCError,\n    QuiltServerError\n  } from 'quilt-sdk';\n\n  // Tool schemas\n  import { QUILT_TOOL_SCHEMAS } from 'quilt-sdk';\n  ");
                    // ═══════════════════════════════════════════════════════════════
                    // 11. OPTIONAL PARAMETERS - Type-safe defaults
                    // ═══════════════════════════════════════════════════════════════
                    console.log('1️⃣1️⃣  OPTIONAL PARAMETERS (Type-Safe Defaults)\n');
                    console.log('Methods with optional parameters:');
                    console.log("\n  // Empty request (all fields optional)\n  await client.getHealth();\n  await client.getSystemInfo();\n  await client.listVolumes();\n  await client.listNetworkAllocations();\n\n  // Partial requests (TypeScript validates what you provide)\n  await client.getContainerStatus({ container_id: 'abc' });\n  await client.getContainerStatus({ container_name: 'my-app' });\n\n  // Complex optional fields\n  await client.createContainer({\n    image_path: '/path/to/image.tar',  // Required\n    name: 'optional-name',             // Optional\n    memory_limit_mb: 512,              // Optional\n    // ... TypeScript knows which are required vs optional\n  });\n  ");
                    // ═══════════════════════════════════════════════════════════════
                    // SUMMARY
                    // ═══════════════════════════════════════════════════════════════
                    console.log('\n═══════════════════════════════════════════════════════');
                    console.log('  TYPE SAFETY HIGHLIGHTS');
                    console.log('═══════════════════════════════════════════════════════\n');
                    console.log("\n  \u2705 All 31 methods are fully typed\n  \u2705 Request interfaces validate at compile time\n  \u2705 Response types provide autocomplete\n  \u2705 Nested objects and arrays fully typed\n  \u2705 Enums for type-safe constants\n  \u2705 Optional vs required parameters clearly marked\n  \u2705 Error classes with typed properties\n  \u2705 AsyncIterator properly typed for streaming\n  \u2705 Record<string, string> for maps\n  \u2705 Complex nested structures fully supported\n  \u2705 TypeScript autocomplete works everywhere\n  \u2705 Catch typos at compile time, not runtime\n  ");
                    return [4 /*yield*/, client.disconnect()];
                case 8:
                    _k.sent();
                    console.log('✓ Disconnected\n');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('Error:', error.message);
    process.exit(1);
});
