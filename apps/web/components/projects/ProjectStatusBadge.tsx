import {
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/constants";

const styles: Record<ProjectStatus, string> = {
  active: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  archived: "bg-slate-100 text-slate-600",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
