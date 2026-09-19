import * as React from "react";

import { MobileNav, Sidebar } from "@/components/shell/sidebar";

/**
 * Persistent chrome for every route. The sidebar is fixed at lg and above and
 * swaps to a sticky pill bar below it; pages only ever render their own
 * content into `main`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden">
      <Sidebar />
      <MobileNav />
      <div className="lg:pl-54">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
