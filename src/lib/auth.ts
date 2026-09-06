import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticate } from "@/lib/auth/authenticate";

/**
 * NextAuth v4 configuration — Credentials Provider (HU-1.1).
 *
 * `authorize` delegates to the pure `authenticate` helper (Zod → findUnique →
 * bcrypt r10) and returns `{ id, email, role }` on success. The JWT callbacks
 * transport `id` and `role` so the role-based proxy (HU-1.2) and server
 * actions can read them; `token.role` is always set from the authenticated
 * user (R-3/R-4).
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authenticate(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};