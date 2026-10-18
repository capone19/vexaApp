"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const StudioPlataforma = dynamic(() => import("@/views/studio/StudioPlataforma"), { ssr: false, loading: () => <PageLoader /> });

export default function StudioPlataformaPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudioPlataforma />
    </Suspense>
  );
}
