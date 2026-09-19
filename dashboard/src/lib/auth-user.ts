import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db, users } from "@/db";
import {
  claimLegacyDataIfNeeded,
  LEGACY_USER_ID,
} from "@/lib/legacy-user";

/** Require a signed-in user (cookie session or API bearer). */
export async function requireUserId(req?: Request): Promise<string> {
  const id = await resolveUserId(req);
  if (!id) throw new AuthRequiredError();
  return id;
}

/** Pages: session user, after an optional one-time legacy claim. */
export async function getDashboardUserId(): Promise<string | null> {
  return resolveUserId();
}

export async function getOptionalUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export class AuthRequiredError extends Error {
  constructor() {
    super("Sign in required");
    this.name = "AuthRequiredError";
  }
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthRequiredError) return unauthorizedJson();
  return null;
}

async function resolveUserId(req?: Request): Promise<string | null> {
  const session = await auth();
  let id = session?.user?.id ?? null;

  if (!id && req) {
    const token = bearerToken(req);
    if (token && isValidApiToken(token)) {
      id = LEGACY_USER_ID;
    } else if (process.env.AUTH_DEV_LOGIN === "1" && isLocalPhone(req)) {
      // Personal LAN: the iOS app always sends X-Log-Dev. Do not require a typed code.
      id = LEGACY_USER_ID;
    }
  }

  if (!id) return null;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existing[0]) {
    if (process.env.AUTH_DEV_LOGIN === "1") {
      id = LEGACY_USER_ID;
    } else {
      return null;
    }
  }

  await claimLegacyDataIfNeeded(id);
  return id;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (header) {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  const alt = req.headers.get("x-log-token")?.trim();
  return alt || null;
}

function isLocalPhone(req: Request): boolean {
  return req.headers.get("x-log-dev")?.trim() === "1";
}

function isValidApiToken(token: string): boolean {
  const configured = process.env.AUTH_API_TOKEN?.trim();
  if (configured && timingSafeEqual(token, configured)) return true;

  // Local-only fallback so the phone can use AUTH_SECRET without extra setup.
  if (process.env.AUTH_DEV_LOGIN === "1") {
    const secret = process.env.AUTH_SECRET?.trim();
    if (secret && timingSafeEqual(token, secret)) return true;
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
