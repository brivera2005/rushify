"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getLastLiveTab } from "@/lib/iptv/client-storage";

export function LiveRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getLastLiveTab());
  }, [router]);

  return (
    <div className="h-32 animate-pulse rounded-2xl bg-rush-surface/60" aria-label="Loading live TV" />
  );
}
