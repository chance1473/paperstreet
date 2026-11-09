"use server";

import { revalidatePath } from "next/cache";

import { LIMITS, overLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/session";
import { passwordSchema, profileAppearanceUpdate, profileSchema } from "@/lib/validation";

export async function updateProfile(input: unknown): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your profile details." };
  }

  const appearance = profileAppearanceUpdate(user.id, parsed.data);
  if (!appearance.ok) return appearance;

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(appearance.row).eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, message: "That username is already taken." };
    return { ok: false, message: "Your profile could not be updated." };
  }

  revalidatePath("/settings");
  revalidatePath("/leaderboard");
  return { ok: true, message: "Profile updated." };
}

export async function updatePassword(input: unknown): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };

  if (overLimit(LIMITS.password, user.id)) {
    return { ok: false, message: "Too many password attempts. Wait a few minutes and try again." };
  }

  const record = typeof input === "object" && input ? (input as Record<string, unknown>) : {};
  const password = passwordSchema.safeParse(record.password);
  if (!password.success) {
    return { ok: false, message: password.error.issues[0]?.message ?? "Enter a valid password." };
  }
  if (password.data !== record.confirm) {
    return { ok: false, message: "Passwords do not match." };
  }

  const current = typeof record.current === "string" ? record.current : "";
  if (!current || !user.email) return { ok: false, message: "Enter your current password." };

  const supabase = await createClient();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (reauthError) return { ok: false, message: "Your current password is not correct." };

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { ok: false, message: "Password could not be updated." };
  return { ok: true, message: "Password updated." };
}

export async function resetPaperAccount(): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (overLimit(LIMITS.reset, user.id)) {
    return { ok: false, message: "Too many resets. Wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, message: "Account reset is not configured. Add the server-side service role key." };
  }

  const { error } = await admin.rpc("reset_paper_account", { p_user_id: user.id });
  if (error) return { ok: false, message: "The account could not be reset. Nothing was changed." };

  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/transactions");
  revalidatePath("/leaderboard");
  revalidatePath("/settings");
  return {
    ok: true,
    message: "Paper account reset to $100,000. Positions, transactions, and performance history were cleared.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/login");
}
