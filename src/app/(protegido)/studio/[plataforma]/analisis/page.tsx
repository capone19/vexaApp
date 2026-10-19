"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/PageLoader";

const YouTubeView = dynamic(() => import("@/views/studio/YouTubeAnalisis"), { ssr: false, loading: () => <PageLoader /> });
const InstagramView = dynamic(() => import("@/views/studio/InstagramAnalisis"), { ssr: false, loading: () => <PageLoader /> });
const GenericView = dynamic(() => import("@/views/studio/StudioProximamente"), { ssr: false, loading: () => <PageLoader /> });

export default function StudioAnalisisPage() {
  const params = useParams<{ plataforma: string }>();
  const View = params?.plataforma === "youtube" ? YouTubeView : params?.plataforma === "instagram" ? InstagramView : GenericView;
  return (
    <Suspense fallback={<PageLoader />}>
      <View />
    </Suspense>
  );
}
