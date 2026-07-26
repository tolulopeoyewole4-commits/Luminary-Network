import {
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "@/lib/projects/constants";

export function ProjectTypeBadge({ type }: { type: ProjectType }) {
  return (
    <span className="inline-flex rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-[var(--border)]">
      {PROJECT_TYPE_LABELS[type]}
    </span>
  );
}
