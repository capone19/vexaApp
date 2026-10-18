"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const NotFound = dynamic(() => import("@/views/NotFound"), { ssr: false, loading: () => <PageLoader /> });

export default function NotFoundPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NotFound />
    </Suspense>
  );
}
