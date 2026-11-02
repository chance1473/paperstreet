export const PROFILE_IMAGE_BUCKET = "profile-images";
export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const BUILT_IN_BACKGROUNDS = ["ink", "ledger", "dusk"] as const;
export type BuiltInBackground = (typeof BUILT_IN_BACKGROUNDS)[number];

export const SOUNDTRACKS = [
  { id: "opening-bell", label: "Opening bell", src: "/soundtracks/opening-bell.wav" },
  { id: "quiet-tape", label: "Quiet tape", src: "/soundtracks/quiet-tape.wav" },
  { id: "after-hours", label: "After hours", src: "/soundtracks/after-hours.wav" },
] as const;

export type SoundtrackId = (typeof SOUNDTRACKS)[number]["id"];
export type ProfileImageKind = "avatar" | "background";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfileImageContentType = (typeof IMAGE_TYPES)[number];

export function isBuiltInBackground(value: string | null | undefined): value is BuiltInBackground {
  return value === "ink" || value === "ledger" || value === "dusk";
}

export function profileImageUploadTarget(userId: string, kind: ProfileImageKind) {
  if (!/^[0-9a-f-]{8,}$/i.test(userId)) {
    throw new Error("Missing profile.");
  }
  return {
    bucket: PROFILE_IMAGE_BUCKET,
    path: `${userId}/${kind === "avatar" ? "avatar" : "background"}`,
  };
}

export function inspectProfileImage(file: { type: string; size: number; name?: string }):
  | { ok: true; contentType: ProfileImageContentType }
  | { ok: false; message: string } {
  let type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!type && file.name) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "jpg" || extension === "jpeg") type = "image/jpeg";
    if (extension === "png") type = "image/png";
    if (extension === "webp") type = "image/webp";
  }
  if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") {
    return { ok: false, message: "Use a JPEG, PNG, or WebP image." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > PROFILE_IMAGE_MAX_BYTES) {
    return { ok: false, message: "Keep the image under 2 MB." };
  }
  return { ok: true, contentType: type };
}

export function profileImagePublicUrl(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !path) return null;
  if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.split("/").includes("..")) return null;
  const encoded = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/storage/v1/object/public/${PROFILE_IMAGE_BUCKET}/${encoded}`;
}

export function soundtrackSrc(choice: string | null | undefined) {
  return SOUNDTRACKS.find((track) => track.id === choice)?.src ?? null;
}

export type DeskSurface = {
  className: string;
  style?: {
    backgroundImage: string;
    backgroundSize: "cover";
    backgroundPosition: "center";
  };
};

export function deskSurface(choice: string | null | undefined): DeskSurface {
  if (choice === "ledger") return { className: "desk-ledger" };
  if (choice === "dusk") return { className: "desk-dusk" };
  if (choice && !isBuiltInBackground(choice)) {
    const url = profileImagePublicUrl(choice);
    if (url) return imageSurface(url);
  }
  return { className: "desk-ink" };
}

export function imageSurface(url: string): DeskSurface {
  return {
    className: "",
    style: {
      backgroundImage: `linear-gradient(180deg, rgba(7,8,11,0.28), rgba(7,8,11,0.62)), url("${url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  };
}
