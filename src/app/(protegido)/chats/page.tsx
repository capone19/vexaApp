"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

const Chats = dynamic(() => import("@/views/Chats"), { ssr: false, loading: () => <PageLoader /> });

export default function ChatsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Chats />
    </Suspense>
  );
}
