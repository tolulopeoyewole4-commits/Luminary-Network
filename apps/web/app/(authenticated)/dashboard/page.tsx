import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/EmptyState";
import { getOwnProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getOwnProfile(supabase, user.id) : null;
  const greetingName =
    profile?.display_name || profile?.full_name || user?.email || "there";

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          Dashboard
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Welcome, {greetingName}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Your private workspace for turning knowledge into courses, social
          content, and video. Projects arrive in Milestone 2.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Recent projects</p>
          <p className="mt-2 font-display text-3xl font-semibold">0</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Processing jobs</p>
          <p className="mt-2 font-display text-3xl font-semibold">0</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Generated content</p>
          <p className="mt-2 font-display text-3xl font-semibold">0</p>
        </div>
      </section>

      <EmptyState
        title="No projects yet"
        description="Create your first project to upload a book, PDF, or long-form video. Project management lands in the next milestone."
        action={
          <button type="button" className="btn-primary" disabled>
            New project (coming soon)
          </button>
        }
      />

      <div className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Creator profile</h2>
          <p className="mt-1 text-sm text-muted">
            Review the profile created for your account.
          </p>
        </div>
        <Link href="/settings" className="btn-secondary">
          Open settings
        </Link>
      </div>
    </div>
  );
}
