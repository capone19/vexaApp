"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const View = dynamic(() => import("@/views/studio/YouTubeProgramacion"), { ssr: false, loading: () => <PageLoader /> });

export default function StudioProgramarPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <View />
    </Suspense>
  );
}
