type AlertProps = {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
};

const toneStyles = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-teal-200 bg-teal-50 text-teal-900",
  info: "border-slate-200 bg-white/80 text-slate-700",
};

export function Alert({ tone = "info", children }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl border px-3.5 py-3 text-sm ${toneStyles[tone]}`}
    >
      {children}
    </div>
  );
}
