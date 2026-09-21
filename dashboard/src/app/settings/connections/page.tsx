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
        description="Apple Health on iPhone today. Health Connect and Google Fit stay ready for Android — same hub tables either way."
      />

      <Panel>
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Data sources</PanelTitle>
            <PanelDescription>
              Apple Health is live on iOS. Health Connect and Google Fit are
              wired as placeholders until the Android client lands.
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody flush>
          <ConnectionsPanel initial={connections} />
        </PanelBody>
      </Panel>
    </div>
  );
}
