import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { getOwnProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOwnProfile(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          Settings
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Creator profile
        </h1>
        <p className="mt-2 text-muted">
          Your profile is private and protected by Row-Level Security. Only you
          can view this record.
        </p>
      </section>

      {!profile ? (
        <Alert tone="info">
          Profile not found yet. If you just registered, refresh in a moment —
          the database trigger creates your profile on signup. Ensure
          `database/migrations/0001_profiles.sql` has been applied in Supabase.
        </Alert>
      ) : (
        <dl className="surface-card divide-y divide-[var(--border)]">
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm text-muted">Display name</dt>
            <dd className="sm:col-span-2 text-sm font-medium">
              {profile.display_name || "—"}
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm text-muted">Full name</dt>
            <dd className="sm:col-span-2 text-sm font-medium">
              {profile.full_name || "—"}
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm text-muted">Email</dt>
            <dd className="sm:col-span-2 text-sm font-medium">{profile.email}</dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm text-muted">Creator type</dt>
            <dd className="sm:col-span-2 text-sm font-medium">
              {profile.creator_type || "Not set"}
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm text-muted">Preferred tone</dt>
            <dd className="sm:col-span-2 text-sm font-medium">
              {profile.preferred_tone || "Not set"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
