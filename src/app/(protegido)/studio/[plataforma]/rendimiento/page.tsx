"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const View = dynamic(() => import("@/views/studio/YouTubeRendimiento"), { ssr: false, loading: () => <PageLoader /> });

export default function StudioRendimientoPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <View />
    </Suspense>
  );
}
