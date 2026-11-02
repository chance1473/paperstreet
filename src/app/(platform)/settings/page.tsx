import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordForm, ProfileForm, ResetAccountButton } from "@/components/settings/settings-forms";
import { getProfile } from "@/lib/portfolio";
import { getSessionUser } from "@/lib/supabase/session";

export const metadata = { title: "Settings · PaperStreet" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  const created = profile?.createdAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(profile.createdAt))
    : "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Profile, password, and paper-account controls." />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Email: {user.email}</p>
          <p>Opened: {created}</p>
          <p className="text-muted-foreground">Starting virtual cash: $100,000.00. Paper trading only — no real money.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <ProfileForm username={profile.username} displayName={profile.displayName} />
          ) : (
            <p className="text-sm text-muted-foreground">Profile data is unavailable.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Restores cash to $100,000.00 and permanently deletes positions, transactions, and performance snapshots.
          </p>
          <ResetAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
