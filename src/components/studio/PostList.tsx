import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/studio/PlatformIcon";
import { DemoBadge, EmptyState, PostStatusBadge } from "@/components/studio/StudioUI";
import { useStudio } from "@/contexts/StudioContext";
import { FORMAT_LABELS, PLATFORMS } from "@/lib/studio/platforms";
import type { StudioPost } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

interface PostListProps {
  posts: StudioPost[];
  showPlatform?: boolean;
  emptyText?: string;
}

export function PostList({ posts, showPlatform = false, emptyText = "Aún no hay publicaciones en cola." }: PostListProps) {
  const { accounts, removePost } = useStudio();

  if (posts.length === 0) {
    return <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="Sin publicaciones" description={emptyText} />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {posts.map((post) => {
        const account = accounts.find((a) => a.id === post.accountId);
        return (
          <li key={post.id} className="group flex items-center gap-3 py-3">
            {showPlatform && (
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", PLATFORMS[post.platform].chipClassName)}>
                <PlatformIcon platform={post.platform} className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
                {post.demo && <DemoBadge />}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {FORMAT_LABELS[post.format]} · {account?.handle ?? "Cuenta eliminada"}
                {post.scheduledAt && ` · ${format(new Date(post.scheduledAt), "EEE d MMM, HH:mm", { locale: es })}`}
              </p>
            </div>
            <PostStatusBadge status={post.status} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
              onClick={() => removePost(post.id)}
              aria-label="Eliminar publicación"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
