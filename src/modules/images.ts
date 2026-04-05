import type { QuiltClient } from "../core/client";
import type { OperationAcceptedResponse } from "../types/common";
import type { JsonRequestBody } from "../types/surface";

export type OciPullRequest = JsonRequestBody<"/api/oci/images/pull", "post">;
export type OciBuildRequest = JsonRequestBody<"/api/oci/images/build", "post">;
export interface BuildContextUploadResponse {
  context_id: string;
  size_bytes: number;
}

export class ImagesModule {
  public constructor(private readonly client: QuiltClient) {}

  public pull(body: OciPullRequest) {
    return this.client.post("/api/oci/images/pull", { body });
  }

  public list(query?: { filter?: string; include_digests?: boolean }) {
    return this.client.get("/api/oci/images", { query });
  }

  public inspect(reference: string) {
    return this.client.get("/api/oci/images/inspect", {
      query: { reference },
    });
  }

  public history(reference: string) {
    return this.client.get("/api/oci/images/history", {
      query: { reference },
    });
  }

  public remove(reference: string, pruneLayers = false) {
    return this.client.delete("/api/oci/images", {
      query: { reference, prune_layers: pruneLayers },
    });
  }

  public uploadBuildContext(content: string): Promise<BuildContextUploadResponse> {
    return this.client.raw<BuildContextUploadResponse>("post", "/api/build-contexts", {
      body: { content },
    });
  }

  public build(body: OciBuildRequest) {
    return this.client.raw<OperationAcceptedResponse>("post", "/api/oci/images/build", {
      body: {
        ...body,
        dockerfile_path: body.dockerfile_path ?? "Dockerfile",
        build_args: body.build_args ?? {},
      },
    });
  }
}
