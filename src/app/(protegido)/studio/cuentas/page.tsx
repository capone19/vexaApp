"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const StudioCuentas = dynamic(() => import("@/views/studio/StudioCuentas"), { ssr: false, loading: () => <PageLoader /> });

export default function StudioCuentasPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudioCuentas />
    </Suspense>
  );
}
