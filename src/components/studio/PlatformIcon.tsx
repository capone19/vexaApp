import { Instagram, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/lib/studio/types";

// lucide no trae logo de TikTok
export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn("h-5 w-5", className)}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.37-2.48V9.66a5.7 5.7 0 0 0-.77-.05 5.69 5.69 0 0 0-5.69 5.69A5.69 5.69 0 0 0 9.86 21a5.69 5.69 0 0 0 5.68-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48Z" />
    </svg>
  );
}

const icons: Record<PlatformId, React.ElementType> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: TikTokIcon,
};

interface PlatformIconProps {
  platform: PlatformId;
  className?: string;
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  const Icon = icons[platform];
  return <Icon className={cn("h-5 w-5", className)} />;
}
