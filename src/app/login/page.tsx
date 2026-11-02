import { AuthScreen } from "@/components/auth/auth-screen";
import { LoginForm } from "@/components/auth/auth-forms";
import { hasPublicSupabaseEnv } from "@/lib/utils";

export const metadata = { title: "Log in · PaperStreet" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthScreen title="Log in" footnote="Paper trading only — no real money.">
      {!hasPublicSupabaseEnv() ? (
        <p className="text-sm text-muted-foreground">
          Add the Supabase URL and anon key from `.env.example` before signing in.
        </p>
      ) : (
        <>
          {params.error ? (
            <p className="mb-4 text-sm text-rose-300">The sign-in link expired. Try again.</p>
          ) : null}
          <LoginForm nextPath={params.next ?? "/dashboard"} />
        </>
      )}
    </AuthScreen>
  );
}
