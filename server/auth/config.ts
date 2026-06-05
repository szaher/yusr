import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/server/db/client";
import { verifyPassword } from "./password";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
          include: { role: true },
        });

        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await verifyPassword(
          parsed.data.password,
          user.passwordHash
        );

        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= 5
                ? new Date(Date.now() + 15 * 60 * 1000)
                : null,
            },
          });
          return null;
        }

        if (user.failedLoginAttempts > 0) {
          await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
          locale: user.locale,
          accountStatus: user.accountStatus,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.locale = user.locale;
        token.accountStatus = user.accountStatus;
        token.tokenVersion = user.tokenVersion;
        token.lastChecked = Date.now();
      }

      if (!user && token.id) {
        const lastChecked = (token.lastChecked as number) || 0;
        if (Date.now() - lastChecked > 5 * 60 * 1000) {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { accountStatus: true, tokenVersion: true, role: { select: { name: true } } },
          });
          if (dbUser) {
            // Invalidate session if tokenVersion has changed (e.g. password reset)
            if (dbUser.tokenVersion !== token.tokenVersion) {
              token.id = null;
              return token;
            }
            token.role = dbUser.role.name;
            token.accountStatus = dbUser.accountStatus;
          }
          token.lastChecked = Date.now();
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.locale = token.locale as string;
      session.user.accountStatus = token.accountStatus as string | null;
      return session;
    },
  },
});
