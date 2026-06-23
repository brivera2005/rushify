"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import type { AuthUser } from "@/types/jellyfin";

async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return null;
  const data = (await response.json()) as { user: AuthUser | null };
  return data.user;
}

export function UserMenu() {
  const router = useRouter();
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-rush-muted sm:inline">{user.username}</span>
      <Button variant="ghost" onClick={handleSignOut} className="text-xs">
        Sign out
      </Button>
    </div>
  );
}
