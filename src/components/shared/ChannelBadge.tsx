import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/types";
import { MessageCircle } from "lucide-react";

interface ChannelBadgeProps {
  channel: Channel;
  showLabel?: boolean;
  className?: string;
}

const channelConfig: Record<
  Channel,
  { label: string; icon: React.ElementType; className: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    className: "bg-emerald-50 text-emerald-600",
  },
};

export function ChannelBadge({
  channel,
  showLabel = true,
  className,
}: ChannelBadgeProps) {
  const config = channelConfig[channel];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && config.label}
    </span>
  );
}
