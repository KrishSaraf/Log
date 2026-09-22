import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ConnectionsPanel } from "@/components/settings/connections-panel";
import { PageHeader, Panel, PanelBody, PanelDescription, PanelHeader, PanelTitle } from "@/components/kit";
import { getDashboardUserId } from "@/lib/auth-user";
import { loadConnections } from "@/lib/connections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  const userId = await getDashboardUserId();
  if (!userId) redirect("/sign-in");

  const connections = await loadConnections(userId);

  return (
    <div className="relative space-y-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 right-0 left-0 -z-10 h-40 bg-[radial-gradient(ellipse_at_top,rgba(198,241,53,0.07),transparent_60%)]"
      />
      <PageHeader
        eyebrow="Integrations"
        title="Connections"
        description="One hub for every source — Apple Health live on iPhone, Health Connect polished for Android, Google Fit as fallback."
      />

      <Panel className="overflow-hidden reveal border-lime-line/20">
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Data sources</PanelTitle>
            <PanelDescription>
              Enable a source to claim it on your account. Native sync follows
              from the phone clients into the same health_metrics tables.
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          <ConnectionsPanel initial={connections} />
        </PanelBody>
      </Panel>
    </div>
  );
}
