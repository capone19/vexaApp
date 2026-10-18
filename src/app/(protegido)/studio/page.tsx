"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const StudioDashboard = dynamic(() => import("@/views/studio/StudioDashboard"), { ssr: false, loading: () => <PageLoader /> });

export default function StudioDashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudioDashboard />
    </Suspense>
  );
}
