import { AppleLogo, GoogleLogo } from "@phosphor-icons/react/dist/ssr";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { Brand } from "@/components/shell/brand";

const googleReady = Boolean(process.env.NEXT_PUBLIC_AUTH_GOOGLE);
const appleReady = Boolean(process.env.NEXT_PUBLIC_AUTH_APPLE);
const devLogin = process.env.AUTH_DEV_LOGIN === "1";

async function continueAsKrish() {
  "use server";
  try {
    await signIn("dev", { redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/sign-in?error=${encodeURIComponent(error.type)}`);
    }
    throw error;
  }
}

async function continueWithGoogle() {
  "use server";
  try {
    await signIn("google", { redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/sign-in?error=${encodeURIComponent(error.type)}`);
    }
    throw error;
  }
}

async function continueWithApple() {
  "use server";
  try {
    await signIn("apple", { redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/sign-in?error=${encodeURIComponent(error.type)}`);
    }
    throw error;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="reveal mb-10 flex justify-center">
        <Brand size="hero" />
      </div>

      <div className="reveal reveal-delay-1 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Your health home
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-muted">
          Activity, workouts, vitals, sleep, nutrition, and connections — private
          to your account.
        </p>
      </div>

      <div className="reveal reveal-delay-2 mt-10 space-y-3">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-negative/40 bg-negative/10 px-4 py-3 text-center text-sm text-negative"
          >
            Sign-in failed ({error}). Try again.
          </p>
        ) : null}

        {devLogin ? (
          <form action={continueAsKrish}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 text-sm font-semibold text-on-lime transition-opacity hover:opacity-90"
            >
              Continue as Krish
            </button>
          </form>
        ) : null}

        {googleReady ? (
          <form action={continueWithGoogle}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface/80 px-4 text-sm font-medium text-text backdrop-blur-sm transition-colors hover:border-lime-line hover:bg-surface-raised"
            >
              <GoogleLogo size={18} weight="bold" />
              Continue with Google
            </button>
          </form>
        ) : null}

        {appleReady ? (
          <form action={continueWithApple}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-text px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              <AppleLogo size={18} weight="fill" />
              Continue with Apple
            </button>
          </form>
        ) : null}

        {!devLogin && !googleReady && !appleReady ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-center text-sm text-text-muted">
            No sign-in methods configured yet. Add OAuth keys or enable local
            test login in <span className="text-text">.env.local</span>.
          </p>
        ) : null}
      </div>

      <p className="reveal reveal-delay-3 mt-8 text-center text-xs text-text-faint">
        {devLogin
          ? "Local test login — Google/Apple when you’re ready."
          : "We never post on your behalf."}
      </p>
    </div>
  );
}
