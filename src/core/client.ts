import { AgentModule } from "../modules/agent";
import { ApiKeysModule } from "../modules/api-keys";
import { AuthModule } from "../modules/auth";
import { ClustersModule } from "../modules/clusters";
import { ContainersModule } from "../modules/containers";
import { ElasticityModule } from "../modules/elasticity";
import { FunctionsModule } from "../modules/functions";
import { MasterModule } from "../modules/master";
import { MonitorsModule } from "../modules/monitors";
import { NotificationsModule } from "../modules/notifications";
import { PlatformModule } from "../modules/platform";
import { ProjectsModule } from "../modules/projects";
import { SystemModule } from "../modules/system";
import { TerminalModule } from "../modules/terminal";
import { VolumesModule } from "../modules/volumes";
import { EventsClient } from "../realtime/events";
import { TerminalRealtimeClient } from "../realtime/terminal";
import type { QuiltAuth, QuiltClientOptions } from "../types/common";
import type {
  HttpMethod,
  StablePathForMethod,
  StableRequestOptions,
  SuccessResponse,
} from "../types/surface";
import { QuiltTransport, type RawRequestOptions } from "./http";

const DEFAULT_BASE_URL = "https://backend.quilt.sh";
const DEFAULT_TIMEOUT_MS = 30_000;

export class QuiltClient {
  private readonly transport: QuiltTransport;

  public readonly auth: AuthModule;
  public readonly apiKeys: ApiKeysModule;
  public readonly system: SystemModule;
  public readonly containers: ContainersModule;
  public readonly projects: ProjectsModule;
  public readonly notifications: NotificationsModule;
  public readonly volumes: VolumesModule;
  public readonly clusters: ClustersModule;
  public readonly agent: AgentModule;
  public readonly functions: FunctionsModule;
  public readonly elasticity: ElasticityModule;
  public readonly monitors: MonitorsModule;
  public readonly master: MasterModule;
  public readonly terminal: TerminalModule;
  public readonly events: EventsClient;
  public readonly terminalRealtime: TerminalRealtimeClient;
  public readonly platform: PlatformModule;

  public constructor(options: QuiltClientOptions = {}) {
    const auth = resolveAuth(options);

    this.transport = new QuiltTransport({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      auth,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      defaultHeaders: options.defaultHeaders ?? {},
      fetchImpl: options.fetch ?? globalThis.fetch,
    });

    this.auth = new AuthModule(this);
    this.apiKeys = new ApiKeysModule(this);
    this.system = new SystemModule(this);
    this.containers = new ContainersModule(this);
    this.projects = new ProjectsModule(this);
    this.notifications = new NotificationsModule(this);
    this.volumes = new VolumesModule(this);
    this.clusters = new ClustersModule(this);
    this.agent = new AgentModule(this);
    this.functions = new FunctionsModule(this);
    this.elasticity = new ElasticityModule(this);
    this.monitors = new MonitorsModule(this);
    this.master = new MasterModule(this);
    this.terminal = new TerminalModule(this);
    this.events = new EventsClient(this);
    this.terminalRealtime = new TerminalRealtimeClient(this);
    this.platform = new PlatformModule(this);
  }

  public static connect(options: QuiltClientOptions = {}): QuiltClient {
    return new QuiltClient(options);
  }

  public getAuth(): QuiltAuth {
    return this.transport.getAuth();
  }

  public getQueryToken(): string | null {
    return this.transport.getQueryToken();
  }

  public getBaseUrl(): string {
    return this.transport.getBaseUrl();
  }

  public request<M extends HttpMethod, P extends StablePathForMethod<M>>(
    method: M,
    path: P,
    options?: StableRequestOptions<P, M>,
  ): Promise<SuccessResponse<P, M>> {
    return this.transport.request(method, path, options);
  }

  public get<P extends StablePathForMethod<"get">>(
    path: P,
    options?: StableRequestOptions<P, "get">,
  ): Promise<SuccessResponse<P, "get">> {
    return this.transport.request("get", path, options);
  }

  public post<P extends StablePathForMethod<"post">>(
    path: P,
    options?: StableRequestOptions<P, "post">,
  ): Promise<SuccessResponse<P, "post">> {
    return this.transport.request("post", path, options);
  }

  public put<P extends StablePathForMethod<"put">>(
    path: P,
    options?: StableRequestOptions<P, "put">,
  ): Promise<SuccessResponse<P, "put">> {
    return this.transport.request("put", path, options);
  }

  public patch<P extends StablePathForMethod<"patch">>(
    path: P,
    options?: StableRequestOptions<P, "patch">,
  ): Promise<SuccessResponse<P, "patch">> {
    return this.transport.request("patch", path, options);
  }

  public delete<P extends StablePathForMethod<"delete">>(
    path: P,
    options?: StableRequestOptions<P, "delete">,
  ): Promise<SuccessResponse<P, "delete">> {
    return this.transport.request("delete", path, options);
  }

  public raw<TResponse>(
    method: string,
    path: string,
    options?: RawRequestOptions,
  ): Promise<TResponse> {
    return this.transport.requestRaw<TResponse>(method, path, options);
  }

  public async awaitOperation(
    operationId: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      signal?: AbortSignal;
    } = {},
  ): Promise<OperationStatus> {
    const intervalMs = options.intervalMs ?? 1_000;
    const timeoutMs = options.timeoutMs ?? 300_000;
    const startedAt = Date.now();

    while (true) {
      if (options.signal?.aborted) {
        throw new Error("Operation wait aborted");
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for operation ${operationId}`);
      }

      const status = await this.platform.getOperationStatus(operationId);
      if (isTerminalStatus(status.status)) {
        return status;
      }

      await sleep(intervalMs, options.signal);
    }
  }
}

export interface OperationStatus {
  operation_id: string;
  status: "accepted" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "timed_out";
  message?: string;
  result?: unknown;
  error?: unknown;
}

function resolveAuth(options: QuiltClientOptions): QuiltAuth {
  if (options.auth !== undefined) {
    return options.auth;
  }

  if (options.apiKey !== undefined && options.token !== undefined) {
    return { type: "apiKey", apiKey: options.apiKey };
  }

  if (options.apiKey !== undefined) {
    return { type: "apiKey", apiKey: options.apiKey };
  }

  if (options.token !== undefined) {
    return { type: "bearer", token: options.token };
  }

  return { type: "none" };
}

function isTerminalStatus(value: OperationStatus["status"]): boolean {
  return (
    value === "succeeded" || value === "failed" || value === "cancelled" || value === "timed_out"
  );
}

async function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) {
    throw new Error("Aborted");
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    if (signal !== undefined) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("Aborted"));
        },
        { once: true },
      );
    }
  });
}
