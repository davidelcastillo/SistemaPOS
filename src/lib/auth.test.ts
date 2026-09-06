import { describe, expect, it } from "vitest";
import { authOptions } from "@/lib/auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";

/**
 * Unit tests for the `authOptions` data contract (R-1/R-3): the credentials
 * provider is registered with `authorize`, and the JWT/session callbacks
 * transport `id` + `role`. Full credential verification is covered by the
 * `authenticate` integration suite.
 */
describe("authOptions (R-1/R-3 — JWT/session contract)", () => {
  it("registers the credentials provider with an authorize function", () => {
    expect(authOptions.session).toEqual({ strategy: "jwt" });
    expect(authOptions.pages).toEqual({ signIn: "/login" });

    const provider = authOptions.providers[0] as CredentialsConfig;
    expect(provider.id).toBe("credentials");
    expect(typeof provider.authorize).toBe("function");
  });

  it("returns null from authorize for an invalid payload (Zod rejects before DB)", async () => {
    const provider = authOptions.providers[0] as CredentialsConfig;
    const user = await provider.authorize?.(
      { email: "no-es-email", password: "" },
      {} as never,
    );
    expect(user).toBeNull();
  });

  it("stores id and role in the token on sign-in", async () => {
    const jwt = authOptions.callbacks?.jwt;
    expect(jwt).toBeDefined();

    const token = (await jwt?.({
      token: {},
      user: { id: "u1", email: "a@pos.com", role: "admin" },
      account: null,
      profile: null,
      isNewUser: false,
    } as never)) as { id: string; role: "admin" | "cashier" };

    expect(token.id).toBe("u1");
    expect(token.role).toBe("admin");
  });

  it("keeps the existing role on later token refreshes", async () => {
    const jwt = authOptions.callbacks?.jwt;
    expect(jwt).toBeDefined();

    const token = (await jwt?.({
      token: { id: "u1", role: "cashier" },
      user: undefined,
      account: null,
      profile: null,
      isNewUser: false,
    } as never)) as { role: "cashier" };

    expect(token.role).toBe("cashier");
  });

  it("exposes id and role on the session from the token", async () => {
    const sessionCb = authOptions.callbacks?.session;
    expect(sessionCb).toBeDefined();

    const session = (await sessionCb?.({
      session: {
        user: { name: "A", email: "a@pos.com", image: null },
        expires: "2030-01-01T00:00:00.000Z",
      },
      token: { id: "u1", role: "admin" },
    } as never)) as { user: { id: string; role?: "admin" | "cashier" } };

    expect(session.user.id).toBe("u1");
    expect(session.user.role).toBe("admin");
  });

  it("does not expose role when the token lacks it", async () => {
    const sessionCb = authOptions.callbacks?.session;
    expect(sessionCb).toBeDefined();

    const session = (await sessionCb?.({
      session: {
        user: { name: "A", email: "a@pos.com", image: null },
        expires: "2030-01-01T00:00:00.000Z",
      },
      token: {},
    } as never)) as { user: { id?: string; role?: "admin" | "cashier" } };

    expect(session.user.role).toBeUndefined();
  });
});