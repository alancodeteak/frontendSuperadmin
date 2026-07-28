export const COOKIE_CONSENT_VERSION = 1;

const STORAGE_KEY = "yaadro.cookie-consent";
const COOKIE_NAME = "yaadro_cookie_consent";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type CookieCategory = "necessary" | "analytics" | "preferences";

export type CookieConsent = {
  version: number;
  /** Session and security cookies — cannot be disabled. */
  necessary: true;
  analytics: boolean;
  preferences: boolean;
  decidedAt: string;
};

export type CookieChoices = Pick<CookieConsent, "analytics" | "preferences">;

export const ALL_ACCEPTED: CookieChoices = {
  analytics: true,
  preferences: true,
};

export const OPTIONAL_REJECTED: CookieChoices = {
  analytics: false,
  preferences: false,
};

const listeners = new Set<() => void>();
let snapshot: CookieConsent | null = null;
let hydrated = false;

function parse(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CookieConsent>;
    if (value.version !== COOKIE_CONSENT_VERSION) return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(value.analytics),
      preferences: Boolean(value.preferences),
      decidedAt:
        typeof value.decidedAt === "string"
          ? value.decidedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeCookie(consent: CookieConsent | null) {
  if (typeof document === "undefined") return;
  if (!consent) {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  const flags = [
    "necessary",
    consent.analytics ? "analytics" : null,
    consent.preferences ? "preferences" : null,
  ]
    .filter(Boolean)
    .join(".");
  document.cookie = `${COOKIE_NAME}=v${consent.version}:${flags}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeConsent(listener: () => void) {
  listeners.add(listener);

  function onStorage(event: StorageEvent) {
    if (event.key && event.key !== STORAGE_KEY) return;
    hydrated = false;
    emit();
  }

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Cached so React's store subscription sees a stable reference. */
export function getConsentSnapshot(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  if (!hydrated) {
    snapshot = parse(window.localStorage.getItem(STORAGE_KEY));
    hydrated = true;
  }
  return snapshot;
}

export function getServerConsentSnapshot(): CookieConsent | null {
  return null;
}

export function saveConsent(choices: CookieChoices): CookieConsent {
  const consent: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: choices.analytics,
    preferences: choices.preferences,
    decidedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  writeCookie(consent);
  snapshot = consent;
  hydrated = true;
  emit();
  return consent;
}

export function clearConsent() {
  window.localStorage.removeItem(STORAGE_KEY);
  writeCookie(null);
  snapshot = null;
  hydrated = true;
  emit();
}

export function hasConsentFor(
  consent: CookieConsent | null,
  category: CookieCategory,
): boolean {
  if (!consent) return category === "necessary";
  if (category === "necessary") return true;
  return consent[category];
}
