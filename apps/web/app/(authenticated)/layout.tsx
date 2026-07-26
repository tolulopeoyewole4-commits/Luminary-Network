import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { getOwnProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOwnProfile(supabase, user.id);
  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    user.email ||
    "Creator";

  return (
    <div className="min-h-screen">
      <AppHeader displayName={displayName} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
