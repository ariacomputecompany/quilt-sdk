import type { OperationAcceptedResponse } from "../types/common"
import type { QuiltClient } from "../core/client"

export interface OciPullRequest {
  reference: string
  force?: boolean
  platform?: string
  registry_username?: string
  registry_password?: string
}

export interface OciBuildRequest {
  context_id: string
  image_reference: string
  dockerfile_path?: string
  build_args?: Record<string, string>
  target_stage?: string
}

export interface BuildContextUploadResponse {
  context_id: string
  size_bytes: number
}

export class ImagesModule {
  public constructor(private readonly client: QuiltClient) {}

  public pull(body: OciPullRequest) {
    return this.client.raw<Record<string, unknown>>("post", "/api/oci/images/pull", { body })
  }

  public list(query?: { filter?: string; include_digests?: boolean }) {
    return this.client.raw<Record<string, unknown>>("get", "/api/oci/images", { query })
  }

  public inspect(reference: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/oci/images/inspect", {
      query: { reference },
    })
  }

  public history(reference: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/oci/images/history", {
      query: { reference },
    })
  }

  public remove(reference: string, pruneLayers = false) {
    return this.client.raw<Record<string, unknown>>("delete", "/api/oci/images", {
      query: { reference, prune_layers: pruneLayers },
    })
  }

  public uploadBuildContext(content: string) {
    return this.client.raw<BuildContextUploadResponse>("post", "/api/build-contexts", {
      body: { content },
    })
  }

  public build(body: OciBuildRequest) {
    return this.client.raw<OperationAcceptedResponse>("post", "/api/oci/images/build", {
      body: {
        dockerfile_path: "Dockerfile",
        build_args: {},
        ...body,
      },
    })
  }
}
