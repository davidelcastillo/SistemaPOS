import { describe, expect, it } from "vitest";
import { authOptions } from "@/lib/auth";
import type { NextAuthOptions } from "next-auth";

type JwtCallback = NonNullable<NextAuthOptions["callbacks"]>["jwt"];
type SessionCallback = NonNullable<NextAuthOptions["callbacks"]>["session"];

describe("authOptions (R-1/R-3 — JWT/session contract)", () => {
  it("registers the credentials provider with an authorize function", () => {
    expect(authOptions.session).toEqual({ strategy: "jwt" });
    expect(authOptions.pages).toEqual({ signIn: "/login" });

    const provider = authOptions.providers[0];
    expect(provider.id).toBe("credentials");
    expect(typeof provider.authorize).toBe("function");
  });

  it("returns null from authorize for an invalid payload (Zod rejects before DB)", async () => {
    const provider = authOptions.providers[0];
    const user = await provider.authorize?.(
      { email: "no-es-email", password: "" },
      {} as never,
    );
    expect(user).toBeNull();
  });

  it("stores id and role in the token on sign-in", async () => {
    const jwt = authOptions.callbacks?.jwt as JwtCallback;
    const token = (await jwt({
      token: {},
      user: { id: "u1", email: "a@pos.com", role: "admin" },
      account: null,
      profile: null,
      isNewUser: false,
    })) as { id: string; role: "admin" | "cashier" };

    expect(token.id).toBe("u1");
    expect(token.role).toBe("admin");
  });

  it("keeps the existing role on later token refreshes", async () => {
    const jwt = authOptions.callbacks?.jwt as JwtCallback;
    const token = (await jwt({
      token: { id: "u1", role: "cashier" },
      user: undefined,
      account: null,
      profile: null,
      isNewUser: false,
    })) as { role: "cashier" };

    expect(token.role).toBe("cashier");
  });

  it("exposes id and role on the session from the token", async () => {
    const sessionCb = authOptions.callbacks?.session as SessionCallback;
    const session = await sessionCb({
      session: {
        user: { name: "A", email: "a@pos.com", image: null },
        expires: "2030-01-01T00:00:00.000Z",
      },
      token: { id: "u1", role: "admin" },
    });

    expect(session.user.id).toBe("u1");
    expect(session.user.role).toBe("admin");
  });

  it("does not expose role when the token lacks it", async () => {
    const sessionCb = authOptions.callbacks?.session as SessionCallback;
    const session = await sessionCb({
      session: {
        user: { name: "A", email: "a@pos.com", image: null },
        expires: "2030-01-01T00:00:00.000Z",
      },
      token: {},
    });

    expect(session.user.role).toBeUndefined();
  });
});