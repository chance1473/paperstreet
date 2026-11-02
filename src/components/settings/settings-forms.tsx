"use client";

import { useState, useTransition } from "react";
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

export function PasswordForm() {
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePassword({
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
