import type { QuiltClient } from "../core/client";

export interface ElasticityControlHeaders extends Record<string, string> {
  "X-Tenant-Id"?: string;
  "Idempotency-Key"?: string;
  "X-Orch-Action-Id"?: string;
}

export interface ElasticityControlContractPaths {
  resize_container: string;
  set_function_pool_target: string;
  workload_function_binding: string;
  rotate_workload_function_binding: string;
  workload_placement_preference: string;
  node_group_scale: string;
  rollback_action: string;
}

export interface ElasticityControlContract {
  control_base_url: string;
  auth_header: string;
  requires_api_key: boolean;
  paths: ElasticityControlContractPaths;
}

export class ElasticityModule {
  public constructor(private readonly client: QuiltClient) {}

  public nodeStatus(headers?: ElasticityControlHeaders) {
    return this.client.raw<Record<string, unknown>>("get", "/api/elasticity/node/status", {
      headers,
    });
  }

  public resizeContainer(
    containerId: string,
    body: { memory_limit_mb?: number; cpu_limit_percent?: number },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>("post", "/api/elasticity/containers/{id}/resize", {
      pathParams: { id: containerId },
      headers,
      body,
    });
  }

  public setFunctionPoolTarget(
    functionId: string,
    body: { min_instances?: number; max_instances?: number },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>("post", "/api/elasticity/functions/{id}/pool-target", {
      pathParams: { id: functionId },
      headers,
      body,
    });
  }

  public controlResizeContainer(
    containerId: string,
    body: { memory_limit_mb?: number; cpu_limit_percent?: number },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "post",
      "/api/elasticity/control/containers/{id}/resize",
      {
        pathParams: { id: containerId },
        headers,
        body,
      },
    );
  }

  public controlGetOperation(operationId: string, headers?: ElasticityControlHeaders) {
    return this.client.raw<Record<string, unknown>>(
      "get",
      "/api/elasticity/control/operations/{id}",
      {
        pathParams: { id: operationId },
        headers,
      },
    );
  }

  public controlListActionOperations(actionId: string, headers?: ElasticityControlHeaders) {
    return this.client.raw<Array<Record<string, unknown>>>(
      "get",
      "/api/elasticity/control/actions/{id}/operations",
      {
        pathParams: { id: actionId },
        headers,
      },
    );
  }

  public controlSetFunctionPoolTarget(
    functionId: string,
    body: { min_instances?: number; max_instances?: number },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "post",
      "/api/elasticity/control/functions/{id}/pool-target",
      {
        pathParams: { id: functionId },
        headers,
        body,
      },
    );
  }

  public controlPutWorkloadFunctionBinding(
    workloadId: string,
    body: { function_id: string },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "put",
      "/api/elasticity/control/workloads/{id}/function-binding",
      {
        pathParams: { id: workloadId },
        headers,
        body,
      },
    );
  }

  public controlGetWorkloadFunctionBinding(
    workloadId: string,
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "get",
      "/api/elasticity/control/workloads/{id}/function-binding",
      {
        pathParams: { id: workloadId },
        headers,
      },
    );
  }

  public controlRotateWorkloadFunctionBinding(
    workloadId: string,
    body: { next_function_id: string; cutover_at?: number },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "post",
      "/api/elasticity/control/workloads/{id}/function-binding/rotate",
      {
        pathParams: { id: workloadId },
        headers,
        body,
      },
    );
  }

  public controlPutWorkloadPlacementPreference(
    workloadId: string,
    body: { node_group?: string | null; anti_affinity?: boolean | null },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "put",
      "/api/elasticity/control/workloads/{id}/placement-preference",
      {
        pathParams: { id: workloadId },
        headers,
        body,
      },
    );
  }

  public controlGetWorkloadPlacementPreference(
    workloadId: string,
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "get",
      "/api/elasticity/control/workloads/{id}/placement-preference",
      {
        pathParams: { id: workloadId },
        headers,
      },
    );
  }

  public controlScaleNodeGroup(
    nodeGroup: string,
    body: { delta_units: number },
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "post",
      "/api/elasticity/control/node-groups/{id}/scale",
      {
        pathParams: { id: nodeGroup },
        headers,
        body,
      },
    );
  }

  public controlRollbackAction(
    actionId: string,
    body: { reason?: string | null } = {},
    headers?: ElasticityControlHeaders,
  ) {
    return this.client.raw<Record<string, unknown>>(
      "post",
      "/api/elasticity/control/actions/{id}/rollback",
      {
        pathParams: { id: actionId },
        headers,
        body,
      },
    );
  }

  public controlContract() {
    return this.client.raw<ElasticityControlContract>("get", "/api/elasticity/control/contract");
  }
}
