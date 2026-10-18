"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const Auth = dynamic(() => import("@/views/Auth"), { ssr: false, loading: () => <PageLoader /> });

export default function AuthPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Auth />
    </Suspense>
  );
}
