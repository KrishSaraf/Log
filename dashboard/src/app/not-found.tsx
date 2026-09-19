import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, Panel, PanelBody } from "@/components/kit";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Panel>
      <PanelBody flush>
        <EmptyState
          icon={CompassIcon}
          title="No page here"
          description="That route does not exist in the dashboard."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to Today</Link>
            </Button>
          }
        />
      </PanelBody>
    </Panel>
  );
}
