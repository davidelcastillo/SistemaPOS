import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * Structural authOptions shell — FASE 0.
 *
 * No credential validation yet: `authorize` always returns null (HU-1.1 fills
 * this with bcrypt verification against the `User` table). The JWT callbacks
 * already transport `id` and `role` so the role-based middleware (HU-1.2) can
 * read them once a real session exists.
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
      // TODO Auth (HU-1.1): verify credentials with bcrypt (10 rounds) and
      // return the user with `id` + `role` from the database.
      authorize: async () => null,
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