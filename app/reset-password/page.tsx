"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      router.push("/upload");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Choose a new password</h1>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="New password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
