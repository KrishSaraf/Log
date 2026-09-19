"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AccountMenu() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-raised" />;
  }

  if (!data?.user) {
    return (
      <Link
        href="/sign-in"
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text"
      >
        Sign in
      </Link>
    );
  }

  const label = data.user.name?.split(" ")[0] || data.user.email || "Account";

  return (
    <div className="flex items-center gap-2 px-1">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text">{label}</p>
        {data.user.email ? (
          <p className="truncate text-[10px] text-text-faint">{data.user.email}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/sign-in" })}
        className="shrink-0 rounded-lg border border-line px-2 py-1 text-[10px] font-medium text-text-muted hover:text-text"
      >
        Sign out
      </button>
    </div>
  );
}
