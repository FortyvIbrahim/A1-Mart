import { GOOGLE_MAPS_API_KEY } from "@/constants";

/**
 * Load Google Maps JavaScript API (async loader for importLibrary / PlaceAutocompleteElement).
 * @see https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 * @see https://developers.google.com/maps/documentation/javascript/places-migration-autocomplete
 * @returns {Promise<typeof google>}
 */
export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);

  const key = GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`;
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
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}
