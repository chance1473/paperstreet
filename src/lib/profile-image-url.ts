import "server-only";

import { acceptedProfileImagePath, PROFILE_IMAGE_BUCKET } from "@/lib/appearance";
import { createAdminClient } from "@/lib/supabase/admin";

const TEN_MINUTES = 60 * 10;

export async function signedProfileImageUrl(path: string | null | undefined) {
  const safe = acceptedProfileImagePath(path);
  if (!safe) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage.from(PROFILE_IMAGE_BUCKET).createSignedUrl(safe, TEN_MINUTES);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
