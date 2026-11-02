"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    setPending(false);
    if (signInError) {
      setError("Email or password is incorrect.");
      return;
    }
    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-4">
      <Field id="email" label="Email" type="email" autoComplete="email" />
      <Field id="password" label="Password" type="password" autoComplete="current-password" />
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </Button>
      <p className="text-sm text-muted-foreground">
        New to PaperStreet?{" "}
          <Link href="/signup" className="text-[#e7c98a]">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    setNotice(null);
    const origin = window.location.origin;
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          username: String(formData.get("username") ?? "").toLowerCase(),
          display_name: String(formData.get("displayName") ?? ""),
        },
      },
    });
    setPending(false);
    if (signUpError) {
      setError(signUpError.message || "Account could not be created.");
      return;
    }
    if (!data.session) {
      setNotice("Check your email to confirm the account, then log in. Your $100,000 paper account is created with the user.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-4">
      <Field id="displayName" label="Display name" autoComplete="nickname" />
      <Field id="username" label="Username" autoComplete="username" />
      <Field id="email" label="Email" type="email" autoComplete="email" />
      <Field id="password" label="Password" type="password" autoComplete="new-password" />
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-200">{notice}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-[#e7c98a]">
          Log in
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} autoComplete={autoComplete} required />
    </div>
  );
}
