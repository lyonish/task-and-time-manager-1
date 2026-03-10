import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Node.js-only imports (no db, no bcrypt).
// Used by middleware for JWT verification.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { avatarUrl?: string | null }).avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
