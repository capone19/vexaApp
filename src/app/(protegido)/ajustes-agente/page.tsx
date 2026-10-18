"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const AgentSettings = dynamic(() => import("@/views/AgentSettings"), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AgentSettingsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AgentSettings />
    </Suspense>
  );
}
