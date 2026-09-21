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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Integrations"
        title="Connections"
        description="One hub for every source — Apple Health live on iPhone, Health Connect and Google Fit stubbed for Android."
      />

      <Panel className="overflow-hidden reveal">
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
