import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ChatChannelId } from '@/lib/chat-channels';
import { CHAT_CHANNELS } from '@/lib/chat-channels';

interface ChatChannelTabsProps {
  value: ChatChannelId;
  onChange: (channel: ChatChannelId) => void;
  className?: string;
}

const CHANNEL_ORDER: ChatChannelId[] = ['whatsapp', 'instagram'];

export function ChatChannelTabs({ value, onChange, className }: ChatChannelTabsProps) {
  return (
    <div className={cn('flex gap-1 p-1 rounded-lg bg-secondary/50 border border-border', className)}>
      {CHANNEL_ORDER.map(channelId => {
        const config = CHAT_CHANNELS[channelId];
        const isActive = value === channelId;
        return (
          <Button
            key={channelId}
            type="button"
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'flex-1 text-xs h-8',
              !isActive && 'text-muted-foreground'
            )}
            onClick={() => onChange(channelId)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
