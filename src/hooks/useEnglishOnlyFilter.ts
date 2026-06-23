"use client";

import { useCallback, useEffect, useState } from "react";

import { getEnglishOnlyPreference, setEnglishOnlyPreference } from "@/lib/iptv/client-storage";

export function useEnglishOnlyFilter() {
  const [englishOnly, setEnglishOnlyState] = useState(true);

  useEffect(() => {
    setEnglishOnlyState(getEnglishOnlyPreference());
  }, []);

  const setEnglishOnly = useCallback((enabled: boolean) => {
    setEnglishOnlyPreference(enabled);
    setEnglishOnlyState(enabled);
  }, []);

  return { englishOnly, setEnglishOnly };
}
