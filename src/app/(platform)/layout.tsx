import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getProfile } from "@/lib/portfolio";
import { getSessionUser } from "@/lib/supabase/session";
import { hasPublicSupabaseEnv } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (!hasPublicSupabaseEnv()) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24">
        <h1 className="text-2xl font-semibold">Supabase is not configured</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, apply the database migration, then restart the app.
        </p>
      </main>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);

  return <AppShell displayName={profile?.displayName ?? "Trader"}>{children}</AppShell>;
}
