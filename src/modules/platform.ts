import type { QuiltClient } from "../core/client";

export interface OperationStatus {
  operation_id: string;
  status: "accepted" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "timed_out";
  message?: string;
  result?: unknown;
  error?: unknown;
}

export interface ContainerReadyResponse {
  state: string;
  uptime_seconds?: number;
  exec_ready: boolean;
  network_ready: boolean;
  gui_ready?: boolean;
  checks: {
    state_running: boolean;
    minit_responsive: boolean;
    network_configured: boolean;
    managed_image_valid: boolean;
    gui_backend_reachable?: boolean;
  };
}

export class PlatformModule {
  public constructor(private readonly client: QuiltClient) {}

  public getContainerEnv(containerIdentifier: string) {
    return this.client.raw<{ environment: Record<string, string> }>(
      "get",
      "/api/containers/{id}/env",
      { pathParams: { id: containerIdentifier } },
    );
  }

  public patchContainerEnv(containerIdentifier: string, environment: Record<string, string>) {
    return this.client.raw<{ success: boolean }>("patch", "/api/containers/{id}/env", {
      pathParams: { id: containerIdentifier },
      body: { environment },
    });
  }

  public replaceContainerEnv(containerIdentifier: string, environment: Record<string, string>) {
    return this.client.raw<{ success: boolean }>("put", "/api/containers/{id}/env", {
      pathParams: { id: containerIdentifier },
      body: { environment },
    });
  }

  public renameContainer(containerIdentifier: string, name: string) {
    return this.client.raw<{
      success: boolean;
      container_id: string;
      old_name?: string;
      new_name?: string;
      dns_updated?: boolean;
    }>("post", "/api/containers/{id}/rename", {
      pathParams: { id: containerIdentifier },
      body: { name },
    });
  }

  public uploadContainerArchive(
    containerIdentifier: string,
    body: { content: string; strip_components?: number; path?: string },
  ) {
    return this.client.raw<{ success: boolean }>("post", "/api/containers/{id}/archive", {
      pathParams: { id: containerIdentifier },
      body,
    });
  }

  public listContainerJobs(containerIdentifier: string) {
    return this.client.raw<{ jobs: unknown[] }>("get", "/api/containers/{id}/jobs", {
      pathParams: { id: containerIdentifier },
    });
  }

  public getContainerJob(containerIdentifier: string, jobId: string, includeOutput = true) {
    return this.client.raw<Record<string, unknown>>("get", "/api/containers/{id}/jobs/{job_id}", {
      pathParams: { id: containerIdentifier, job_id: jobId },
      query: { include_output: includeOutput },
    });
  }

  public checkContainerReady(containerIdentifier: string) {
    return this.client.raw<ContainerReadyResponse>("get", "/api/containers/{id}/ready", {
      pathParams: { id: containerIdentifier },
    });
  }

  public forkContainer(
    containerIdentifier: string,
    body: { name?: string } = {},
    execution: "sync" | "async" = "async",
  ) {
    return this.client.raw<{ success: boolean; operation_id?: string }>(
      "post",
      "/api/containers/{id}/fork",
      {
        pathParams: { id: containerIdentifier },
        query: { execution },
        body,
      },
    );
  }

  public cloneSnapshot(
    snapshotId: string,
    body: { name?: string } = {},
    execution: "sync" | "async" = "async",
  ) {
    return this.client.raw<{ success: boolean; operation_id?: string }>(
      "post",
      "/api/snapshots/{snapshot_id}/clone",
      {
        pathParams: { snapshot_id: snapshotId },
        query: { execution },
        body,
      },
    );
  }

  public getOperationStatus(operationId: string) {
    return this.client.raw<OperationStatus>("get", "/api/operations/{operation_id}", {
      pathParams: { operation_id: operationId },
    });
  }

  public uploadVolumeArchive(
    volumeName: string,
    body: { content: string; strip_components?: number; path?: string },
  ) {
    return this.client.raw<{ success: boolean }>("post", "/api/volumes/{name}/archive", {
      pathParams: { name: volumeName },
      body,
    });
  }

  public putVolumeFile(volumeName: string, body: { path: string; content: string; mode?: number }) {
    return this.client.raw<{ success: boolean }>("post", "/api/volumes/{name}/files", {
      pathParams: { name: volumeName },
      body,
    });
  }

  public getVolumeFile(volumeName: string, path: string) {
    return this.client.raw<{ content: string }>("get", "/api/volumes/{name}/files/{path}", {
      pathParams: { name: volumeName, path },
    });
  }

  public deleteVolumeFile(volumeName: string, path: string) {
    return this.client.raw<{ success: boolean }>("delete", "/api/volumes/{name}/files/{path}", {
      pathParams: { name: volumeName, path },
    });
  }

  public listNetworkAllocations() {
    return this.client.raw<Record<string, unknown>>("get", "/api/network/allocations");
  }

  public listMonitorProcesses() {
    return this.client.raw<Record<string, unknown>>("get", "/api/monitors/processes");
  }

  public monitorProfile() {
    return this.client.raw<Record<string, unknown>>("get", "/api/monitors/profile");
  }

  public getGuiUrl(containerIdentifier: string) {
    return this.client.raw<{ gui_url: string }>("get", "/api/containers/{id}/gui-url", {
      pathParams: { id: containerIdentifier },
    });
  }

  public iccRoot() {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc");
  }

  public iccHealth() {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/health");
  }

  public iccStreams() {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/streams");
  }

  public iccSchema() {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/schema");
  }

  public iccTypes() {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/types");
  }

  public iccProto() {
    return this.client.raw<string>("get", "/api/icc/proto");
  }

  public iccDescriptor() {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/descriptor");
  }

  public iccPublish(envelopeB64: string) {
    return this.client.raw<Record<string, unknown>>("post", "/api/icc/messages", {
      body: { envelope_b64: envelopeB64 },
    });
  }

  public iccBroadcast(
    envelopeB64: string,
    targets?: { container_ids?: string[]; include_non_running?: boolean; limit?: number },
  ) {
    return this.client.raw<Record<string, unknown>>("post", "/api/icc/messages/broadcast", {
      body: {
        envelope_b64: envelopeB64,
        ...(targets ? { targets } : {}),
      },
    });
  }

  public iccExecBroadcast(body: {
    command: string[];
    workdir?: string;
    capture_output?: boolean;
    timeout_ms?: number;
    detach?: boolean;
    targets?: { container_ids?: string[]; include_non_running?: boolean; limit?: number };
  }) {
    return this.client.raw<Record<string, unknown>>("post", "/api/icc/exec/broadcast", { body });
  }

  public iccContainerStatus(containerIdentifier: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/containers/{id}/icc", {
      pathParams: { id: containerIdentifier },
    });
  }

  public iccContainerPublish(containerIdentifier: string, envelopeB64: string) {
    return this.client.raw<Record<string, unknown>>("post", "/api/containers/{id}/icc/publish", {
      pathParams: { id: containerIdentifier },
      body: { envelope_b64: envelopeB64 },
    });
  }

  public iccStateVersion(containerIdentifier: string) {
    return this.client.raw<Record<string, unknown>>(
      "get",
      "/api/icc/containers/{id}/state-version",
      {
        pathParams: { id: containerIdentifier },
      },
    );
  }

  public iccMessages(query: {
    container_identifier: string;
    from_seq?: number;
    to_seq?: number;
    state?: string;
    limit?: number;
  }) {
    const { container_identifier, ...rest } = query;
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/messages", {
      query: { ...rest, container_id: container_identifier },
    });
  }

  public iccInbox(
    containerIdentifier: string,
    query?: {
      from_seq?: number;
      to_seq?: number;
      state?: string;
      limit?: number;
    },
  ) {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/inbox/{container_id}", {
      pathParams: { container_id: containerIdentifier },
      query,
    });
  }

  public iccAck(body: { msg_id: string; action: "ack" | "nack"; reason?: string }) {
    return this.client.raw<Record<string, unknown>>("post", "/api/icc/ack", {
      body,
    });
  }

  public iccReplay(body: {
    container_identifier: string;
    from_seq?: number;
    to_seq?: number;
    state?: string;
    limit?: number;
  }) {
    const { container_identifier, ...rest } = body;
    return this.client.raw<Record<string, unknown>>("post", "/api/icc/replay", {
      body: { ...rest, container_id: container_identifier },
    });
  }

  public iccDlq(query?: { from_seq?: number; limit?: number }) {
    return this.client.raw<Record<string, unknown>>("get", "/api/icc/dlq", {
      query,
    });
  }

  public iccDlqReplay(streamSeq: number, body: { replay_to_container?: string } = {}) {
    return this.client.raw<Record<string, unknown>>("post", "/api/icc/dlq/{stream_seq}/replay", {
      pathParams: { stream_seq: streamSeq },
      body,
    });
  }

  public ociPull(body: {
    reference: string;
    force?: boolean;
    platform?: string;
    registry_username?: string;
    registry_password?: string;
  }) {
    return this.client.raw<Record<string, unknown>>("post", "/api/oci/images/pull", { body });
  }

  public ociList(query?: { filter?: string; include_digests?: boolean }) {
    return this.client.raw<Record<string, unknown>>("get", "/api/oci/images", { query });
  }

  public ociInspect(reference: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/oci/images/inspect", {
      query: { reference },
    });
  }

  public ociHistory(reference: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/oci/images/history", {
      query: { reference },
    });
  }

  public ociRemove(reference: string, pruneLayers = false) {
    return this.client.raw<Record<string, unknown>>("delete", "/api/oci/images", {
      query: { reference, prune_layers: pruneLayers },
    });
  }
}
