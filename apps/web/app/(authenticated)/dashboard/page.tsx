import Link from "next/link";
import type { Metadata } from "next";

import { Alert } from "@/components/ui/Alert";
import { ProjectList } from "@/components/projects/ProjectList";
import { getOwnProfile } from "@/lib/profiles";
import { countOwnProjects, listOwnProjects } from "@/lib/projects/queries";
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

  const [{ projects, error }, counts] = await Promise.all([
    listOwnProjects(supabase, { limit: 5 }),
    countOwnProjects(supabase),
  ]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Welcome, {greetingName}
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Your private workspace for turning knowledge into courses, social
            content, and video.
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          New project
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Active projects</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {counts.activeCount}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Archived projects</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {counts.archivedCount}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Processing jobs</p>
          <p className="mt-2 font-display text-3xl font-semibold">0</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Recent projects</h2>
          <Link href="/projects" className="text-sm font-semibold text-accent hover:underline">
            View all
          </Link>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <ProjectList projects={projects} />
      </section>

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
