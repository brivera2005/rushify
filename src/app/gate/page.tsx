"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Footer } from "@/components/layout/Footer";
import { RushifyLogo } from "@/components/layout/RushifyLogo";

function GateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pin.trim()) {
      setError("Enter the access PIN");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Incorrect PIN");
        setPin("");
        inputRef.current?.focus();
        return;
      }

      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") ? from : "/login");
      router.refresh();
    } catch {
      setError("Could not verify PIN");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card glow className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <RushifyLogo />
        </div>
        <CardTitle className="text-center">Access PIN</CardTitle>
        <CardDescription className="text-center">
          Enter the site PIN to continue to Rushify.
        </CardDescription>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value);
              setError(null);
            }}
            placeholder="PIN"
            className="w-full rounded-xl border border-rush-border bg-rush-surface px-4 py-3 text-center text-lg tracking-[0.35em] text-rush-foreground outline-none focus:border-rush-accent/50 focus:ring-1 focus:ring-rush-accent/30"
          />
          {error ? (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Checking…" : "Continue"}
          </Button>
        </form>
      </Card>
      </div>
      <Footer />
    </div>
  );
}

export default function GatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-rush-muted">
          Loading…
        </div>
      }
    >
      <GateForm />
    </Suspense>
  );
}
