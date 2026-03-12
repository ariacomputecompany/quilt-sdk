import type { QuiltClient } from "../core/client";

export class ProjectsModule {
  public constructor(private readonly client: QuiltClient) {}

  public list() {
    return this.client.get("/api/projects");
  }

  public create(body: {
    name: string;
    description?: string;
    color?: string;
  }) {
    return this.client.post("/api/projects", { body });
  }

  public get(id: string) {
    return this.client.get("/api/projects/{id}", { pathParams: { id } });
  }

  public update(
    id: string,
    body: {
      name?: string;
      description?: string;
      color?: string;
      archived?: boolean;
    },
  ) {
    return this.client.put("/api/projects/{id}", {
      pathParams: { id },
      body,
    });
  }

  public delete(id: string) {
    return this.client.delete("/api/projects/{id}", { pathParams: { id } });
  }

  public assignContainer(body: { project_id: string; container_id: string }) {
    return this.client.post("/api/projects/assign-container", { body });
  }
}
