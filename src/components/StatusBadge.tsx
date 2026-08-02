const STYLES: Record<string, string> = {
  READY: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  PROCESSING: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  PENDING: "border-white/20 bg-white/5 text-white/60",
  FAILED: "border-red-400/40 bg-red-400/10 text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? STYLES.PENDING;
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
