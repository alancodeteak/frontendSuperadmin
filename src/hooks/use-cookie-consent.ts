"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  ALL_ACCEPTED,
  OPTIONAL_REJECTED,
  clearConsent,
  getConsentSnapshot,
  getServerConsentSnapshot,
  saveConsent,
  subscribeConsent,
  type CookieChoices,
} from "@/lib/cookie-consent";

export function useCookieConsent() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  // Consent lives in localStorage, so the first client render must match the
  // server output before we can decide whether to show the notice.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const save = useCallback((choices: CookieChoices) => {
    saveConsent(choices);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent(ALL_ACCEPTED);
  }, []);

  const rejectOptional = useCallback(() => {
    saveConsent(OPTIONAL_REJECTED);
  }, []);

  const reset = useCallback(() => {
    clearConsent();
  }, []);

  return {
    consent,
    ready: mounted,
    needsDecision: mounted && consent === null,
    save,
    acceptAll,
    rejectOptional,
    reset,
  };
}
