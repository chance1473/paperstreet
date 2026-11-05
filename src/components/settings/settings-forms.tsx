"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPaperAccount, updatePassword, updateProfile } from "@/lib/actions/settings";
import {
  BUILT_IN_BACKGROUNDS,
  SOUNDTRACKS,
  deskSurface,
  imageSurface,
  inspectProfileImage,
  isBuiltInBackground,
  profileImagePublicUrl,
  profileImageUploadTarget,
  soundtrackSrc,
  type ProfileImageKind,
  type SoundtrackId,
} from "@/lib/appearance";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ProfileForm({ username, displayName }: { username: string; displayName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfile({
        username: String(formData.get("username") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
      });
      if (!result.ok) toast.error(result.message);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={username} autoComplete="username" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" defaultValue={displayName} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function AppearanceForm({
  userId,
  username,
  displayName,
  avatarPath,
  backgroundChoice,
  soundtrackChoice,
}: {
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  backgroundChoice: string | null;
  soundtrackChoice: string | null;
}) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [background, setBackground] = useState(backgroundChoice);
  const [seenBackground, setSeenBackground] = useState(backgroundChoice);
  const [soundtrack, setSoundtrack] = useState(soundtrackChoice);
  const [seenSoundtrack, setSeenSoundtrack] = useState(soundtrackChoice);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [localBackground, setLocalBackground] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [imageBust, setImageBust] = useState<number | null>(null);
  const bustSource = `${avatarPath ?? ""}\0${background ?? ""}`;
  const [seenBustSource, setSeenBustSource] = useState(bustSource);
  const savedAvatar = profileImagePublicUrl(avatarPath);

  if (backgroundChoice !== seenBackground) {
    setSeenBackground(backgroundChoice);
    setBackground(backgroundChoice);
  }

  if (soundtrackChoice !== seenSoundtrack) {
    setSeenSoundtrack(soundtrackChoice);
    setSoundtrack(soundtrackChoice);
  }

  if (bustSource !== seenBustSource) {
    setSeenBustSource(bustSource);
    setImageBust(Date.now());
  }

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setImageBust(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, [avatarPath, background]);

  const remoteBackground =
    background && !isBuiltInBackground(background) ? profileImagePublicUrl(background) : null;
  const previewBackground = localBackground
    ? imageSurface(localBackground)
    : remoteBackground && imageBust
      ? imageSurface(`${remoteBackground}?v=${imageBust}`)
      : deskSurface(background);
  const initial = displayName.slice(0, 1).toUpperCase() || "P";
  const avatarSrc = localAvatar ?? (savedAvatar && imageBust ? `${savedAvatar}?v=${imageBust}` : savedAvatar);

  async function saveChoice(patch: {
    avatarPath?: string;
    backgroundChoice?: string;
    soundtrackChoice?: SoundtrackId;
  }) {
    return updateProfile({ username, displayName, ...patch });
  }

  async function onImage(kind: ProfileImageKind, list: FileList | null) {
    const file = list?.[0];
    const input = kind === "avatar" ? avatarInputRef.current : backgroundInputRef.current;
    if (input) input.value = "";
    if (!file) return;

    const inspected = inspectProfileImage(file);
    if (!inspected.ok) {
      toast.error(inspected.message);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    if (kind === "avatar") setLocalAvatar(localUrl);
    else setLocalBackground(localUrl);

    setBusy(kind);
    try {
      const target = profileImageUploadTarget(userId, kind);
      const supabase = createClient();
      const { error } = await supabase.storage.from(target.bucket).upload(target.path, file, {
        upsert: true,
        contentType: inspected.contentType,
        cacheControl: "0",
      });
      if (error) {
        toast.error(kind === "avatar" ? "The picture could not be uploaded." : "The background could not be uploaded.");
        if (kind === "avatar") setLocalAvatar(null);
        else setLocalBackground(null);
        return;
      }

      const result = await saveChoice(
        kind === "avatar" ? { avatarPath: target.path } : { backgroundChoice: target.path },
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (kind === "background") setBackground(target.path);
      toast.success(kind === "avatar" ? "Profile picture updated." : "Background updated.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function chooseBackground(choice: (typeof BUILT_IN_BACKGROUNDS)[number]) {
    setLocalBackground(null);
    setBackground(choice);
    setBusy("background");
    try {
      const result = await saveChoice({ backgroundChoice: choice });
      if (!result.ok) {
        setBackground(backgroundChoice);
        toast.error(result.message);
        return;
      }
      toast.success("Background updated.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function chooseSoundtrack(choice: SoundtrackId) {
    stopSoundtrack();
    setSoundtrack(choice);
    setBusy("soundtrack");
    try {
      const result = await saveChoice({ soundtrackChoice: choice });
      if (!result.ok) {
        setSoundtrack(soundtrackChoice);
        toast.error(result.message);
        return;
      }
      toast.success("Soundtrack updated.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function playSoundtrack() {
    const src = soundtrackSrc(soundtrack);
    const audio = audioRef.current;
    if (!src || !audio) {
      toast.error("Choose a soundtrack first.");
      return;
    }
    audio.src = src;
    audio.loop = true;
    void audio.play().then(
      () => setPlaying(true),
      () => {
        setPlaying(false);
        toast.error("That soundtrack could not be played.");
      },
    );
  }

  function stopSoundtrack() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "relative h-36 overflow-hidden rounded-lg border border-white/10",
          previewBackground.className,
        )}
        style={previewBackground.style}
      >
        <div className="absolute bottom-3 left-3 flex items-center gap-3">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Profile picture"
              className="h-16 w-16 rounded-full border-2 border-[#e7c98a] object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#e7c98a] bg-[#07080b]/80 text-lg font-medium">
              {initial}
            </span>
          )}
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-xs text-[#e7c98a]">@{username}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar-file">Profile picture</Label>
        <input
          ref={avatarInputRef}
          id="avatar-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void onImage("avatar", event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => avatarInputRef.current?.click()}
        >
          {busy === "avatar" ? "Uploading…" : avatarPath || localAvatar ? "Replace picture" : "Upload picture"}
        </Button>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP, up to 2 MB.</p>
      </div>

      <div className="space-y-2">
        <Label>Background</Label>
        <div className="grid grid-cols-3 gap-2">
          {BUILT_IN_BACKGROUNDS.map((choice) => {
            const selected = background === choice || (choice === "ink" && !background);
            return (
              <button
                key={choice}
                type="button"
                disabled={busy !== null}
                aria-pressed={selected}
                onClick={() => void chooseBackground(choice)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm capitalize disabled:opacity-50",
                  selected
                    ? "border-[#e7c98a] bg-[#e7c98a]/10 text-[#e7c98a]"
                    : "border-white/10 hover:bg-white/5",
                )}
              >
                {choice}
              </button>
            );
          })}
        </div>
        <input
          ref={backgroundInputRef}
          id="background-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void onImage("background", event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => backgroundInputRef.current?.click()}
        >
          {busy === "background"
            ? "Uploading…"
            : background && !isBuiltInBackground(background)
              ? "Replace background"
              : "Upload background"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {background && !isBuiltInBackground(background)
            ? "Custom image. Choose Ink, Ledger, or Dusk to switch back."
            : "Ink, Ledger, and Dusk come with the desk. One uploaded image replaces them."}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Soundtrack</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {SOUNDTRACKS.map((track) => {
            const selected = soundtrack === track.id;
            return (
              <button
                key={track.id}
                type="button"
                disabled={busy !== null}
                aria-pressed={selected}
                onClick={() => void chooseSoundtrack(track.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm disabled:opacity-50",
                  selected
                    ? "border-[#e7c98a] bg-[#e7c98a]/10 text-[#e7c98a]"
                    : "border-white/10 hover:bg-white/5",
                )}
              >
                {track.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={busy !== null || playing} onClick={playSoundtrack}>
            Play
          </Button>
          <Button type="button" variant="outline" disabled={!playing} onClick={stopSoundtrack}>
            Stop
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Plays only while this settings page is open. Other pages stay quiet.
        </p>
        <audio ref={audioRef} preload="none" />
      </div>
    </div>
  );
}

export function PasswordForm() {
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePassword({
        current: String(formData.get("current") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirm: String(formData.get("confirm") ?? ""),
      });
      if (!result.ok) toast.error(result.message);
      else toast.success(result.message);
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export function ResetAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const result = await resetPaperAccount();
      if (!result.ok) toast.error(result.message);
      else {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger">Reset paper account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset to $100,000?</DialogTitle>
          <DialogDescription>
            This permanently clears open positions, the transaction ledger, and saved portfolio performance.
            Your watchlist and login stay. The reset is atomic: it finishes completely or leaves the account unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={pending} onClick={reset}>
            {pending ? "Resetting…" : "Clear account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
