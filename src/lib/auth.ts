import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/lib/auth.config";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    avatarUrl?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[auth] authorize called, email:", (credentials as { email?: string })?.email);
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          console.log("[auth] validation failed:", parsed.error.flatten());
          return null;
        }

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) {
          console.log("[auth] user not found:", email);
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        console.log("[auth] password match:", passwordMatch, "for", email);
        if (!passwordMatch) {
          return null;
        }

        console.log("[auth] authorize success, id:", user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
});
