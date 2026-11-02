import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Use 3–20 letters, numbers, or underscores.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a display name.")
  .max(40, "Keep the display name under 40 characters.");

export const emailSchema = z.string().trim().email("Enter a valid email.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Password is too long.");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
});

export const orderSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9.]+$/),
  assetType: z.enum(["stock", "crypto"]),
  side: z.enum(["buy", "sell"]),
  mode: z.enum(["quantity", "notional"]),
  amount: z.string().trim().min(1).max(24),
});

export const watchlistSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9.]+$/),
  assetType: z.enum(["stock", "crypto"]),
});

const appearancePathSchema = z
  .string()
  .trim()
  .min(1, "Choose an image.")
  .max(160, "That image path is too long.")
  .regex(/^[A-Za-z0-9._/-]+$/, "Use a file path under your profile.");

export const backgroundChoiceSchema = z.union([
  z.enum(["ink", "ledger", "dusk"]),
  appearancePathSchema,
]);

export const soundtrackChoiceSchema = z.enum(["opening-bell", "quiet-tape", "after-hours"]);

export const profileSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  avatarPath: z.union([appearancePathSchema, z.null()]).optional(),
  backgroundChoice: z.union([backgroundChoiceSchema, z.null()]).optional(),
  soundtrackChoice: z.union([soundtrackChoiceSchema, z.null()]).optional(),
});

const builtInBackgrounds = new Set(["ink", "ledger", "dusk"]);

function ownsAppearancePath(userId: string, path: string) {
  return !path.split("/").includes("..") && path.startsWith(`${userId}/`);
}

export function profileAppearanceUpdate(
  userId: string,
  input: {
    username: string;
    displayName: string;
    avatarPath?: string | null;
    backgroundChoice?: string | null;
    soundtrackChoice?: string | null;
  },
):
  | { ok: true; row: Record<string, string | null> }
  | { ok: false; message: string } {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your profile details." };
  }

  const row: Record<string, string | null> = {
    username: parsed.data.username,
    display_name: parsed.data.displayName,
  };

  if (parsed.data.avatarPath !== undefined) {
    if (parsed.data.avatarPath !== null && !ownsAppearancePath(userId, parsed.data.avatarPath)) {
      return { ok: false, message: "That picture does not belong to this profile." };
    }
    row.avatar_path = parsed.data.avatarPath;
  }

  if (parsed.data.backgroundChoice !== undefined) {
    const choice = parsed.data.backgroundChoice;
    const builtIn = choice !== null && builtInBackgrounds.has(choice);
    if (choice !== null && !builtIn && !ownsAppearancePath(userId, choice)) {
      return { ok: false, message: "That background does not belong to this profile." };
    }
    row.background_choice = choice;
  }

  if (parsed.data.soundtrackChoice !== undefined) {
    row.soundtrack_choice = parsed.data.soundtrackChoice;
  }

  return { ok: true, row };
}

export type OrderInput = z.infer<typeof orderSchema>;
