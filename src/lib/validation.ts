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

export const profileSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
});

export type OrderInput = z.infer<typeof orderSchema>;
