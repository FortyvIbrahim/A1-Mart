import { GOOGLE_MAPS_API_KEY } from "@/constants";

let loadMapsPromise = null;

/**
 * Load Google Maps JavaScript API (singleton loader for importLibrary / places).
 * @returns {Promise<typeof google | null>}
 */
export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);

  const key = GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve(null);

  if (loadMapsPromise) return loadMapsPromise;

  loadMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-a1-gmaps="true"]');
    if (existing) {
      const waitExisting = () => {
        if (window.google?.maps?.importLibrary) {
          resolve(window.google);
        } else {
          setTimeout(waitExisting, 50);
        }
      };
      waitExisting();
      return;
    }

    const script = document.createElement("script");
    script.dataset.a1Gmaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = () => {
        if (window.google?.maps?.importLibrary) {
          resolve(window.google);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    };
    script.onerror = () => {
      loadMapsPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loadMapsPromise;
}
