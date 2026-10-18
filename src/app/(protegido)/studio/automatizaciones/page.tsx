"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const StudioAutomatizaciones = dynamic(() => import("@/views/studio/StudioAutomatizaciones"), { ssr: false, loading: () => <PageLoader /> });

export default function StudioAutomatizacionesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudioAutomatizaciones />
    </Suspense>
  );
}
