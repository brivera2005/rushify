"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { RushifyLogo } from "@/components/layout/RushifyLogo";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

type LoginFormProps = {
  canSignIn: boolean;
};

type AuthConfig = {
  canSignIn: boolean;
  adminConfigured: boolean;
};

export function LoginForm({ canSignIn: initialCanSignIn }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canSignIn, setCanSignIn] = useState(initialCanSignIn);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/config")
      .then((response) => response.json())
      .then((config: AuthConfig) => {
        if (!cancelled) {
          setCanSignIn(config.canSignIn);
        }
      })
      .catch(() => {
        // Keep SSR value if config fetch fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }

      const from = searchParams.get("from") ?? "/";
      // Full navigation ensures the new session cookie is sent on the next request.
      window.location.assign(from);
    } catch {
      setError("Unable to connect. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-80" />
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex justify-center">
            <RushifyLogo />
          </div>

          <div className="rounded-[2rem] border border-rush-border bg-rush-surface/80 p-8 shadow-glow backdrop-blur-xl">
            <h1 className="text-center text-2xl font-semibold tracking-tight">Welcome to Rushify</h1>

            {!canSignIn && (
              <p className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/90">
                Sign-in is not configured yet. Set admin credentials in your server environment.
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm text-rush-muted">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!canSignIn || loading}
                  className="w-full rounded-xl border border-rush-border bg-rush-canvas px-4 py-3 text-sm text-rush-foreground outline-none transition-colors focus:border-rush-accent/50"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm text-rush-muted">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!canSignIn || loading}
                  className="w-full rounded-xl border border-rush-border bg-rush-canvas px-4 py-3 text-sm text-rush-foreground outline-none transition-colors focus:border-rush-accent/50"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={!canSignIn || loading}
                className="w-full py-3"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-rush-muted">
              By signing in you agree to{" "}
              <Link href="/legal" className="text-rush-accent hover:text-rush-accent/80">
                Rushify Terms of Service
              </Link>
              .
            </p>
            <p className="mt-2 text-center text-xs text-rush-muted/80">
              Developed by Benjamin Rivera
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
