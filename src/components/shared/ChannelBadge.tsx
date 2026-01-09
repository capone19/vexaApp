import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/types";
import { MessageCircle, Instagram, Facebook, Globe } from "lucide-react";

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
    className: "bg-success/10 text-success border-success/30",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    className: "bg-pink-500/10 text-pink-500 border-pink-500/30",
  },
  messenger: {
    label: "Messenger",
    icon: Facebook,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  web: {
    label: "Web",
    icon: Globe,
    className: "bg-muted text-muted-foreground border-muted",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && config.label}
    </span>
  );
}
