"use client";

import { AppleLogo, GoogleLogo } from "@phosphor-icons/react";
import { signIn } from "next-auth/react";

import { Brand } from "@/components/shell/brand";

const googleReady = Boolean(process.env.NEXT_PUBLIC_AUTH_GOOGLE);
const appleReady = Boolean(process.env.NEXT_PUBLIC_AUTH_APPLE);
const devLogin = Boolean(process.env.NEXT_PUBLIC_AUTH_DEV_LOGIN);

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <Brand />
      </div>
      <h1 className="text-center text-2xl font-medium tracking-tight text-text">
        Sign in to Log
      </h1>
      <p className="mt-2 text-center text-sm text-text-muted">
        Activity, workouts, vitals, sleep, and meals — private to your account.
      </p>

      <div className="mt-8 space-y-3">
        {devLogin ? (
          <button
            type="button"
            onClick={() => signIn("dev", { callbackUrl: "/" })}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-lime-line bg-lime-quiet px-4 text-sm font-medium text-text transition-colors hover:bg-surface-raised"
          >
            Continue as Krish (local)
          </button>
        ) : null}

        {googleReady ? (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-text transition-colors hover:bg-surface-raised"
          >
            <GoogleLogo size={18} weight="bold" />
            Continue with Google
          </button>
        ) : null}

        {appleReady ? (
          <button
            type="button"
            onClick={() => signIn("apple", { callbackUrl: "/" })}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-text px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            <AppleLogo size={18} weight="fill" />
            Continue with Apple
          </button>
        ) : null}

        {!devLogin && !googleReady && !appleReady ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-center text-sm text-text-muted">
            No sign-in methods configured yet. Add OAuth keys or enable local
            test login in <span className="text-text">.env.local</span>.
          </p>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs text-text-faint">
        {devLogin
          ? "Local test login — skip Google/Apple until you add those credentials."
          : "By continuing you agree to keep this as your personal log. We never post on your behalf."}
      </p>
    </div>
  );
}
