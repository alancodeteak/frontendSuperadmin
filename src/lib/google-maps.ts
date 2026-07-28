import { siteConfig } from "@/config/site";

const SCRIPT_ID = "google-maps-js";

type GoogleMapsWindow = Window & {
  google?: typeof google;
  __googleMapsPromise?: Promise<typeof google>;
};

export function getGoogleMapsApiKey() {
  return siteConfig.googleMapsApiKey;
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }

  const win = window as GoogleMapsWindow;
  const key = getGoogleMapsApiKey();

  if (!key) {
    return Promise.reject(
      new Error("Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to use the map picker"),
    );
  }

  if (win.google?.maps) {
    return Promise.resolve(win.google);
  }

  if (win.__googleMapsPromise) {
    return win.__googleMapsPromise;
  }

  win.__googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (win.google?.maps) resolve(win.google);
        else reject(new Error("Google Maps failed to load"));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps failed to load")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.onload = () => {
      if (win.google?.maps) resolve(win.google);
      else reject(new Error("Google Maps failed to load"));
    };
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return win.__googleMapsPromise;
}
