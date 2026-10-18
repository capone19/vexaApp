"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const AnalisisAgente = dynamic(() => import("@/views/AnalisisAgente"), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AnalisisAgentePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AnalisisAgente />
    </Suspense>
  );
}
