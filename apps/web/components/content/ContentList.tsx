import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import type { GeneratedContent } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  linkedin_post: "LinkedIn",
  instagram_caption: "Instagram",
  x_thread: "X thread",
  youtube_script: "YouTube",
  tiktok_script: "TikTok / Reel",
  newsletter: "Newsletter",
  blog_outline: "Blog outline",
};

export function ContentList({
  projectId,
  items,
}: {
  projectId: string;
  items: GeneratedContent[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No generated content yet"
        description="Create LinkedIn posts, scripts, newsletters, and more from selected document sections."
        action={
          <Link href={`/projects/${projectId}/content/new`} className="btn-primary">
            Generate content
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/projects/${projectId}/content/${item.id}`}
            className="surface-card block px-5 py-4 transition hover:bg-white"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{item.body}</p>
              </div>
              <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-[var(--border)]">
                {TYPE_LABELS[item.content_type] ?? item.content_type} ·{" "}
                {item.generation_status}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
