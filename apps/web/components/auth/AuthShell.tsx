import { Logo } from "@/components/brand/Logo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <Logo size="md" />
        <p className="mt-3 text-sm text-muted">
          The AI Operating System for Knowledge Creators
        </p>
      </div>

      <div className="surface-card px-6 py-7 sm:px-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>

      {footer ? <div className="mt-5 text-center text-sm text-muted">{footer}</div> : null}
    </div>
  );
}
