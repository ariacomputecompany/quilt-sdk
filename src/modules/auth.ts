import type { QuiltClient } from "../core/client";

export class AuthModule {
  public constructor(private readonly client: QuiltClient) {}

  public register(body: {
    email: string;
    password: string;
    name: string;
  }) {
    return this.client.post("/api/auth/register", { body });
  }

  public login(body: { email: string; password: string }) {
    return this.client.post("/api/auth/login", { body });
  }

  public me() {
    return this.client.get("/api/auth/me");
  }
}
