import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";

type AppHeaderProps = {
  displayName: string;
};

export function AppHeader({ displayName }: AppHeaderProps) {
  return (
    <header className="border-b border-[var(--border)] bg-white/55 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo size="sm" href="/dashboard" />
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="rounded-lg px-2 py-1.5 font-medium text-foreground/80 hover:bg-white"
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className="rounded-lg px-2 py-1.5 font-medium text-foreground/80 hover:bg-white"
          >
            Projects
          </Link>
          <Link
            href="/settings"
            className="rounded-lg px-2 py-1.5 font-medium text-foreground/80 hover:bg-white"
          >
            Settings
          </Link>
          <span className="hidden text-muted sm:inline">{displayName}</span>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
