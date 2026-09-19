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
import { seedDefaultHabitsForUser } from "@/lib/seed-habits";

/** Same id as migrate-multiuser legacy owner — so local login sees imported data. */
const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEV_EMAIL = "legacy@log.local";
const DEV_NAME = "Krish (local)";

const devLoginEnabled = process.env.AUTH_DEV_LOGIN === "1";

/**
 * Auth.js v5 — Google + Apple (+ optional local test login).
 *
 * Env (see .env.example / docs/AUTH.md):
 *   AUTH_SECRET
 *   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
 *   AUTH_APPLE_ID / AUTH_APPLE_SECRET
 *   AUTH_DEV_LOGIN=1          — local one-click sign-in (no OAuth)
 *   NEXT_PUBLIC_AUTH_DEV_LOGIN=1
 *   AUTH_URL (e.g. http://localhost:3001)
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
                .where(eq(users.id, DEV_USER_ID))
                .limit(1);

              if (existing[0]) {
                return {
                  id: existing[0].id,
                  email: existing[0].email,
                  name: existing[0].name ?? DEV_NAME,
                };
              }

              await db.insert(users).values({
                id: DEV_USER_ID,
                email: DEV_EMAIL,
                name: DEV_NAME,
              });
              await seedDefaultHabitsForUser(DEV_USER_ID);

              return { id: DEV_USER_ID, email: DEV_EMAIL, name: DEV_NAME };
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
  events: {
    async createUser({ user }) {
      if (user.id) {
        await seedDefaultHabitsForUser(user.id);
      }
    },
  },
});
