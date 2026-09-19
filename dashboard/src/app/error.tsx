"use client";

import { useEffect } from "react";
import { WarningOctagonIcon } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, Panel, PanelBody } from "@/components/kit";
import { Button } from "@/components/ui/button";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Panel>
      <PanelBody flush>
        <EmptyState
          icon={WarningOctagonIcon}
          title="This page could not load"
          description="The request failed before anything could be rendered. The server log has the details."
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              Try again
            </Button>
          }
        />
      </PanelBody>
    </Panel>
  );
}
