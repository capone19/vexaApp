"use client";

import dynamic from "next/dynamic";
import { PageLoader } from "@/components/PageLoader";

// Layout propio del Content Studio (tema lila). Se mantiene montado entre páginas del Studio.
const StudioLayout = dynamic(
  () => import("@/components/studio/StudioLayout").then((m) => m.StudioLayout),
  { ssr: false, loading: () => <PageLoader /> }
);

export default function StudioRootLayout({ children }: { children: React.ReactNode }) {
  return <StudioLayout>{children}</StudioLayout>;
}
