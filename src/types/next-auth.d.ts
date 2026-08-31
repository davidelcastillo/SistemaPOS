import { type DefaultSession } from "next-auth";
import { type DefaultJWT } from "next-auth/jwt";

/**
 * NextAuth v4 module augmentation — POS session contract.
 *
 * The JWT transports `id` + `role` (see `src/lib/auth.ts` callbacks). These
 * types make `session.user.id`/`session.user.role` and `token.id`/`token.role`
 * type-safe across the app (middleware, server actions, RSC).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "cashier";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "admin" | "cashier";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "admin" | "cashier";
  }
}