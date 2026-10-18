"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const MarketingTemplates = dynamic(() => import("@/views/MarketingTemplates"), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function MarketingTemplatesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MarketingTemplates />
    </Suspense>
  );
}
