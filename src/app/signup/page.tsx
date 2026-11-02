import { AuthScreen } from "@/components/auth/auth-screen";
import { SignupForm } from "@/components/auth/auth-forms";
import { hasPublicSupabaseEnv } from "@/lib/utils";

export const metadata = { title: "Create account · PaperStreet" };
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <AuthScreen
      title="Create your desk"
      footnote="New accounts start with $100,000.00 in virtual cash. Paper trading only — no real money."
    >
      {!hasPublicSupabaseEnv() ? (
        <p className="text-sm text-muted-foreground">
          Supabase environment variables are required before signup.
        </p>
      ) : (
        <SignupForm />
      )}
    </AuthScreen>
  );
}
