import type { QuiltClient } from "../core/client";

export interface QuiltFunction {
  id: string;
  tenant_id: string;
  owner_node_id: string;
  name: string;
  description: string | null;
  handler: string;
  runtime: string;
  state: string;
  current_version: number;
  memory_limit_mb: number;
  cpu_limit_percent: number;
  timeout_seconds: number;
  environment: Record<string, string>;
  min_instances: number;
  max_instances: number;
  cleanup_on_exit: boolean;
  working_directory: string | null;
  created_at: number;
  updated_at: number;
  last_invoked_at: number | null;
  invocation_count: number;
  error_count: number;
  error_message: string | null;
}

export interface QuiltInvocation {
  invocation_id: string;
  function_id: string;
  function_name: string;
  execution_node_id: string;
  status: string;
  started_at: number;
  ended_at: number | null;
  duration_ms: number | null;
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
  error_message: string | null;
  cold_start: boolean;
}

export interface QuiltFunctionVersion {
  id: string;
  function_id: string;
  version: number;
  handler: string;
  runtime: string;
  environment: Record<string, string>;
  created_at: number;
  is_active: boolean;
  description: string | null;
}

export interface QuiltFunctionPoolStatus {
  function_id: string;
  warming_count: number;
  ready_count: number;
  busy_count: number;
  total_count: number;
}

export interface QuiltGlobalFunctionPoolStats {
  total_containers: number;
  warming_containers: number;
  ready_containers: number;
  busy_containers: number;
  recycling_containers: number;
  terminating_containers: number;
}

export class FunctionsModule {
  public constructor(private readonly client: QuiltClient) {}

  public list(): Promise<{ functions: QuiltFunction[] }> {
    return this.client.raw("GET", "/api/functions");
  }

  public create(body: Record<string, unknown>): Promise<{
    function_id: string;
    name: string;
    state: string;
    version: number;
  }> {
    return this.client.raw("POST", "/api/functions", { body });
  }

  public get(id: string): Promise<QuiltFunction> {
    return this.client.raw("GET", `/api/functions/${encodeURIComponent(id)}`);
  }

  public update(id: string, body: Record<string, unknown>): Promise<QuiltFunction> {
    return this.client.raw("PUT", `/api/functions/${encodeURIComponent(id)}`, { body });
  }

  public delete(id: string): Promise<void> {
    return this.client.raw("DELETE", `/api/functions/${encodeURIComponent(id)}`);
  }

  public byName(name: string): Promise<QuiltFunction> {
    return this.client.raw("GET", `/api/functions/by-name/${encodeURIComponent(name)}`);
  }

  public deploy(id: string): Promise<QuiltFunction> {
    return this.client.raw("POST", `/api/functions/${encodeURIComponent(id)}/deploy`);
  }

  public pause(id: string): Promise<{ success: boolean; message?: string | null }> {
    return this.client.raw("POST", `/api/functions/${encodeURIComponent(id)}/pause`);
  }

  public resume(id: string): Promise<QuiltFunction> {
    return this.client.raw("POST", `/api/functions/${encodeURIComponent(id)}/resume`);
  }

  public invoke(id: string, body: Record<string, unknown> = {}): Promise<QuiltInvocation> {
    return this.client.raw("POST", `/api/functions/${encodeURIComponent(id)}/invoke`, { body });
  }

  public invokeByName(
    name: string,
    body: Record<string, unknown> = {},
  ): Promise<QuiltInvocation> {
    return this.client.raw("POST", `/api/functions/invoke/${encodeURIComponent(name)}`, { body });
  }

  public listInvocations(
    id: string,
    query?: { limit?: number },
  ): Promise<{ invocations: QuiltInvocation[] }> {
    const suffix =
      query?.limit !== undefined ? `?limit=${encodeURIComponent(String(query.limit))}` : "";
    return this.client.raw("GET", `/api/functions/${encodeURIComponent(id)}/invocations${suffix}`);
  }

  public getInvocation(functionId: string, invocationId: string): Promise<QuiltInvocation> {
    return this.client.raw(
      "GET",
      `/api/functions/${encodeURIComponent(functionId)}/invocations/${encodeURIComponent(invocationId)}`,
    );
  }

  public listVersions(id: string): Promise<{ versions: QuiltFunctionVersion[] }> {
    return this.client.raw("GET", `/api/functions/${encodeURIComponent(id)}/versions`);
  }

  public rollback(id: string, body: { version: number }): Promise<QuiltFunction> {
    return this.client.raw("POST", `/api/functions/${encodeURIComponent(id)}/rollback`, { body });
  }

  public pool(id: string): Promise<QuiltFunctionPoolStatus> {
    return this.client.raw("GET", `/api/functions/${encodeURIComponent(id)}/pool`);
  }

  public poolStats(): Promise<QuiltGlobalFunctionPoolStats> {
    return this.client.raw("GET", "/api/functions/pool/stats");
  }
}
