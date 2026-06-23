"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import type { UserPrefs } from "@/types/user-prefs";

const PREFS_QUERY_KEY = ["user", "prefs"] as const;

async function fetchUserPrefs(): Promise<UserPrefs> {
  const response = await fetch("/api/user/prefs", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Unable to load preferences");
  return response.json() as Promise<UserPrefs>;
}

async function saveUserPrefs(partial: Partial<UserPrefs>): Promise<UserPrefs> {
  const response = await fetch("/api/user/prefs", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!response.ok) throw new Error("Unable to save preferences");
  return response.json() as Promise<UserPrefs>;
}

export function useUserPrefs() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: PREFS_QUERY_KEY,
    queryFn: fetchUserPrefs,
    staleTime: 60_000,
    retry: 2,
  });

  const mutation = useMutation({
    mutationFn: saveUserPrefs,
    onMutate: async (partial) => {
      await queryClient.cancelQueries({ queryKey: PREFS_QUERY_KEY });
      const previous = queryClient.getQueryData<UserPrefs>(PREFS_QUERY_KEY);
      const merged: UserPrefs = {
        hiddenCategories:
          partial.hiddenCategories ??
          previous?.hiddenCategories ??
          [],
      };
      queryClient.setQueryData(PREFS_QUERY_KEY, merged);
      return { previous };
    },
    onError: (_error, _partial, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PREFS_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PREFS_QUERY_KEY, data);
    },
  });

  const hiddenCategories = useMemo(
    () => query.data?.hiddenCategories ?? [],
    [query.data?.hiddenCategories],
  );
  const hiddenSet = useMemo(() => new Set(hiddenCategories), [hiddenCategories]);

  const hideCategory = useCallback(
    async (category: string) => {
      const current =
        queryClient.getQueryData<UserPrefs>(PREFS_QUERY_KEY)?.hiddenCategories ?? hiddenCategories;
      if (current.includes(category)) return;
      await mutation.mutateAsync({ hiddenCategories: [...current, category] });
    },
    [queryClient, hiddenCategories, mutation],
  );

  const showCategory = useCallback(
    async (category: string) => {
      const current =
        queryClient.getQueryData<UserPrefs>(PREFS_QUERY_KEY)?.hiddenCategories ?? hiddenCategories;
      if (!current.includes(category)) return;
      await mutation.mutateAsync({
        hiddenCategories: current.filter((entry) => entry !== category),
      });
    },
    [queryClient, hiddenCategories, mutation],
  );

  return {
    hiddenCategories,
    hiddenSet,
    hideCategory,
    showCategory,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error ?? mutation.error,
  };
}
