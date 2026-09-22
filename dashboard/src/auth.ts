import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";

import { authConfig } from "@/auth.config";
import { db } from "@/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import {
  claimLegacyDataIfNeeded,
  DEV_DISPLAY_NAME,
  LEGACY_EMAIL,
  LEGACY_USER_ID,
} from "@/lib/legacy-user";
import { seedDefaultHabitsForUser } from "@/lib/seed-habits";

const devLoginEnabled = process.env.AUTH_DEV_LOGIN === "1";

/**
 * Auth.js v5 — Google + Apple (+ optional local test login).
 *
 * Dev login authenticates as the legacy imported-data user so Today /
 * Workouts / Health show history immediately. A first-time Google/Apple
 * user gets that history reassigned once (see claimLegacyDataIfNeeded).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Local test",
            credentials: {},
            async authorize() {
              if (process.env.AUTH_DEV_LOGIN !== "1") return null;

              const existing = await db
                .select()
                .from(users)
                .where(eq(users.id, LEGACY_USER_ID))
                .limit(1);

              if (existing[0]) {
                return {
                  id: existing[0].id,
                  email: existing[0].email,
                  name: existing[0].name ?? DEV_DISPLAY_NAME,
                };
              }

              const byEmail = await db
                .select()
                .from(users)
                .where(eq(users.email, LEGACY_EMAIL))
                .limit(1);

              if (byEmail[0]) {
                return {
                  id: byEmail[0].id,
                  email: byEmail[0].email,
                  name: byEmail[0].name ?? DEV_DISPLAY_NAME,
                };
              }

              await db.insert(users).values({
                id: LEGACY_USER_ID,
                email: LEGACY_EMAIL,
                name: DEV_DISPLAY_NAME,
              });
              await seedDefaultHabitsForUser(LEGACY_USER_ID);

              return {
                id: LEGACY_USER_ID,
                email: LEGACY_EMAIL,
                name: DEV_DISPLAY_NAME,
              };
            },
          }),
        ]
      : []),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.id = user.id;
      }
      if (user?.email === LEGACY_EMAIL) {
        token.sub = user.id ?? LEGACY_USER_ID;
        token.id = token.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const id = (typeof token.id === "string" && token.id) || token.sub;
        if (id) session.user.id = id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await claimLegacyDataIfNeeded(user.id);
      await seedDefaultHabitsForUser(user.id);
    },
    async signIn({ user }) {
      if (user.id) {
        await claimLegacyDataIfNeeded(user.id);
        // Keep demo / first sessions from landing on empty habit chains.
        const { seedDemoHabitHistoryIfEmpty } = await import(
          "@/lib/seed-habits"
        );
        await seedDefaultHabitsForUser(user.id);
        await seedDemoHabitHistoryIfEmpty(user.id);
      }
    },
  },
});
