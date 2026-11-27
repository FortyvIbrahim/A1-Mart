"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  Button,
  Text,
  Flex,
  Box,
  Input,
  IconButton,
} from "@chakra-ui/react";
import { LuX, LuSearch, LuMapPin } from "react-icons/lu";
import { loadGoogleMaps } from "./loadGoogleMaps";

const DEFAULT_CENTER = { lat: 11.6643, lng: 78.146 };
const DEFAULT_ZOOM = 13;

/**
 * Parse stored value: object { lat, lng } or { lat, lng, address }, or legacy string "lat,lng" or "lat,lng|address"
 */
export function parseLocationValue(value) {
  if (value == null) return null;
  if (
    typeof value === "object" &&
    typeof value.lat === "number" &&
    typeof value.lng === "number"
  ) {
    return {
      lat: value.lat,
      lng: value.lng,
      address: value.address ?? "",
    };
  }
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const pipe = s.indexOf("|");
  const latLngStr = pipe >= 0 ? s.slice(0, pipe).trim() : s;
  const address = pipe >= 0 ? s.slice(pipe + 1).trim() : "";
  const parts = latLngStr.split(",").map((p) => p?.trim());
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng, address };
}

export default function GoogleLocationPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialValue = null,
}) {
  const mapRef = useRef(null);
  const autocompleteContainerRef = useRef(null);
  const fallbackSearchInputRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const placeAutocompleteRef = useRef(null);

  const initial = parseLocationValue(initialValue);
  const [position, setPosition] = useState(initial);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [usingFallbackSearch, setUsingFallbackSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const resetState = useCallback(() => {
    const parsed = parseLocationValue(initialValue);
    setPosition(parsed);
    setAddress(parsed?.address ?? "");
    setError("");
    setSearchQuery("");
    setSearchResults([]);
  }, [initialValue]);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) return;
    const hasInitial =
      initialValue != null &&
      typeof initialValue === "object" &&
      typeof initialValue.lat === "number" &&
      typeof initialValue.lng === "number";
    if (hasInitial) return;
    if (typeof navigator?.geolocation?.getCurrentPosition !== "function")
      return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition((prev) =>
          prev
            ? prev
            : {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }
        );
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError("");
    setUsingFallbackSearch(false);

    loadGoogleMaps()
      .then((google) => {
        if (!active) return;
        if (!google?.maps) {
          setMapsReady(false);
          setUsingFallbackSearch(true);
          setError(
            "Google Maps API key is not configured. Use place search or enter coordinates below."
          );
          return;
        }
        setMapsReady(true);
      })
      .catch(() => {
        if (!active) return;
        setMapsReady(false);
        setUsingFallbackSearch(true);
        setError("Failed to load Google Maps. Use place search below.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      setMapsReady(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mapsReady) return;

    const google = window.google;
    if (!google?.maps?.importLibrary) return;

    let cancelled = false;
    let geocodeTimeoutId = null;
    let classicAutocomplete = null;
    const GEOCODE_DEBOUNCE_MS = 400;

    const runReverseGeocode = (location) => {
      if (cancelled) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (cancelled) return;
        if (status === "OK" && results?.[0]) {
          setAddress(results[0].formatted_address);
        }
      });
    };

    const scheduleReverseGeocode = (latLng) => {
      if (geocodeTimeoutId) clearTimeout(geocodeTimeoutId);
      geocodeTimeoutId = setTimeout(() => {
        geocodeTimeoutId = null;
        runReverseGeocode(latLng);
      }, GEOCODE_DEBOUNCE_MS);
    };

    const center = position
      ? { lat: position.lat, lng: position.lng }
      : DEFAULT_CENTER;

    const applyPickedLocation = (latLng, formattedAddress, map, marker) => {
      setPosition({ lat: latLng.lat, lng: latLng.lng });
      if (formattedAddress) {
        setAddress(formattedAddress);
      } else {
        scheduleReverseGeocode(latLng);
      }
      marker?.setPosition?.(latLng);
      map?.panTo?.(latLng);
      map?.setZoom?.(16);
    };

    (async () => {
      try {
        const { Map } = await google.maps.importLibrary("maps");
        const { ColorScheme } = await google.maps.importLibrary("core");
        if (cancelled || !mapRef.current) return;

        const map = new Map(mapRef.current, {
          center,
          zoom: DEFAULT_ZOOM,
          mapTypeControl: true,
          streetViewControl: false,
          colorScheme: ColorScheme?.LIGHT ?? "LIGHT",
        });
        mapInstanceRef.current = map;

        const marker = new google.maps.Marker({
          map,
          position: center,
          draggable: true,
        });
        markerRef.current = marker;

        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) {
            setPosition({ lat: p.lat(), lng: p.lng() });
            scheduleReverseGeocode(p);
          }
        });

        map.addListener("click", (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition(e.latLng);
          setPosition({ lat, lng });
          scheduleReverseGeocode(e.latLng);
        });

        const placesLib = await google.maps.importLibrary("places");
        if (cancelled) return;

        const PlaceAutocompleteElement = placesLib?.PlaceAutocompleteElement;

        if (PlaceAutocompleteElement && autocompleteContainerRef.current) {
          try {
            // Avoid passing legacy `types` option; PlaceAutocompleteElement uses no filter or `includedPrimaryTypes`
            const placeAutocomplete = new PlaceAutocompleteElement();
            autocompleteContainerRef.current.innerHTML = "";
            autocompleteContainerRef.current.appendChild(placeAutocomplete);

            placeAutocomplete.placeholder = "Search for a location";
            placeAutocomplete.style.width = "100%";
            placeAutocomplete.style.display = "block";
            placeAutocomplete.style.border = "1px solid #F1E3D9";
            placeAutocomplete.style.borderRadius = "8px";
            placeAutocomplete.style.colorScheme = "light";
            placeAutocompleteRef.current = placeAutocomplete;

            const handlePlacePicked = async (placeObj) => {
              if (cancelled || !placeObj) return;
              try {
                if (typeof placeObj.fetchFields === "function") {
                  await placeObj.fetchFields({
                    fields: ["formattedAddress", "location", "displayName"],
                  });
                }
                const loc = placeObj.location;
                if (!loc) return;
                const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
                const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
                applyPickedLocation(
                  { lat, lng },
                  placeObj.formattedAddress || placeObj.displayName || "",
                  map,
                  marker
                );
              } catch (fetchErr) {
                console.error("Failed to fetch place fields:", fetchErr);
              }
            };

            // Support both modern `gmp-select` (placePrediction) and legacy `gmp-placeselect` (place)
            placeAutocomplete.addEventListener("gmp-select", async (e) => {
              const prediction =
                e?.placePrediction ?? e?.detail?.placePrediction;
              const place = prediction?.toPlace?.() ?? e?.place ?? e?.detail?.place;
              await handlePlacePicked(place);
            });

            placeAutocomplete.addEventListener("gmp-placeselect", async (e) => {
              const place = e?.place ?? e?.detail?.place;
              await handlePlacePicked(place);
            });
          } catch (paeErr) {
            console.warn("PlaceAutocompleteElement unavailable, falling back:", paeErr);
            setUsingFallbackSearch(true);
          }
        } else {
          setUsingFallbackSearch(true);
        }

        // Attach classic Autocomplete if fallback input is rendered
        if (placesLib?.Autocomplete && fallbackSearchInputRef.current) {
          classicAutocomplete = new placesLib.Autocomplete(
            fallbackSearchInputRef.current,
            { fields: ["formatted_address", "geometry", "name"] }
          );
          classicAutocomplete.addListener("place_changed", () => {
            const place = classicAutocomplete.getPlace();
            const loc = place?.geometry?.location;
            if (!loc) return;
            applyPickedLocation(
              { lat: loc.lat(), lng: loc.lng() },
              place.formatted_address || place.name || "",
              map,
              marker
            );
          });
        }

        const resizeWhenVisible = () => {
          if (mapRef.current && map.getDiv?.()?.offsetParent != null) {
            google.maps.event.trigger(map, "resize");
            map.panTo(map.getCenter());
          }
        };
        setTimeout(resizeWhenVisible, 120);
        setTimeout(resizeWhenVisible, 450);
      } catch (err) {
        if (!cancelled) {
          setError("Failed to initialize map. Use place search below.");
          setUsingFallbackSearch(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (geocodeTimeoutId) clearTimeout(geocodeTimeoutId);
      if (classicAutocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(classicAutocomplete);
      }
      if (autocompleteContainerRef.current && placeAutocompleteRef.current) {
        try {
          autocompleteContainerRef.current.removeChild(
            placeAutocompleteRef.current
          );
        } catch (_) {}
      }
      placeAutocompleteRef.current = null;
      markerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [isOpen, mapsReady]);

  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !markerRef.current) return;
    if (position) {
      const latLng = { lat: position.lat, lng: position.lng };
      markerRef.current.setPosition(latLng);
      mapInstanceRef.current.panTo(latLng);
    }
  }, [position?.lat, position?.lng, isOpen]);

  const handleFallbackSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    // Try Google Geocoder first if Maps loaded cleanly
    if (window.google?.maps?.Geocoder) {
      setSearching(true);
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: q }, (results, status) => {
          setSearching(false);
          if (status === "OK" && Array.isArray(results) && results.length) {
            const mapped = results.slice(0, 5).map((r) => ({
              label: r.formatted_address,
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng(),
            }));
            setSearchResults(mapped);
            if (mapped.length === 1) {
              setPosition({ lat: mapped[0].lat, lng: mapped[0].lng });
              setAddress(mapped[0].label);
            }
          } else {
            setSearchResults([]);
          }
        });
        return;
      } catch (_) {
        setSearching(false);
      }
    }

    // Fallback: OpenStreetMap Nominatim search when Google API key is missing
    try {
      setSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
          q
        )}`
      );
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map((item) => ({
        label: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      setSearchResults(mapped);
    } catch (_) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = useCallback(() => {
    if (position) {
      onSelect({
        lat: Number(position.lat),
        lng: Number(position.lng),
        address: address || undefined,
      });
    }
    onClose();
  }, [position, address, onSelect, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Dialog.Root
      open={isOpen}
      modal={false}
      closeOnInteractOutside={false}
      onOpenChange={(e) => !e.open && handleClose()}
    >
      <Dialog.Backdrop
        bg="rgba(31, 41, 55, 0.45)"
        backdropFilter="blur(3px)"
        zIndex={1000}
      />
      <Dialog.Positioner zIndex={1001} p={4}>
        <Dialog.Content
          borderRadius="14px"
          borderWidth="1px"
          borderColor="#E4E7F2"
          overflow="visible"
          maxW="90vw"
          w="660px"
          bg="white"
          boxShadow="0 24px 60px rgba(31, 41, 55, 0.2)"
        >
          <Dialog.Header
            px="24px"
            py="18px"
            borderBottomWidth="1px"
            borderColor="#F0E9E5"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text fontSize="18px" fontWeight="600" color="#202938">
              Select location on map
            </Text>
            <IconButton
              type="button"
              aria-label="Close"
              size="sm"
              w="32px"
              h="32px"
              minW="32px"
              bg="app.tableHeader"
              color="#C95C18"
              borderRadius="8px"
              _hover={{ bg: "brand.100" }}
              onClick={handleClose}
            >
              <LuX size={16} />
            </IconButton>
          </Dialog.Header>

          <Dialog.Body px="24px" py="20px">
            <Text fontSize="12.5px" color="fg.muted" mb={3}>
              Search for a place or click on the map to set the marker.
            </Text>

            {mapsReady && !usingFallbackSearch && (
              <Box
                ref={autocompleteContainerRef}
                mb={3}
                minH="44px"
                position="relative"
                zIndex={20}
              />
            )}

            {(usingFallbackSearch || mapsReady) && (
              <Flex gap={2} mb={3} alignItems="center">
                <Input
                  ref={fallbackSearchInputRef}
                  placeholder="Search address or place name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFallbackSearch();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="md"
                  variant="subtle"
                  loading={searching}
                  onClick={handleFallbackSearch}
                  flexShrink={0}
                >
                  <LuSearch size={15} />
                  Search
                </Button>
              </Flex>
            )}

            {searchResults.length > 0 && (
              <Box
                mb={3}
                borderWidth="1px"
                borderColor="#F1E3D9"
                borderRadius="8px"
                maxH="160px"
                overflowY="auto"
                bg="white"
              >
                {searchResults.map((item, idx) => (
                  <Flex
                    key={`${item.lat}-${item.lng}-${idx}`}
                    as="button"
                    type="button"
                    w="100%"
                    textAlign="left"
                    px="12px"
                    py="8px"
                    gap="8px"
                    alignItems="flex-start"
                    borderBottomWidth={
                      idx === searchResults.length - 1 ? 0 : "1px"
                    }
                    borderColor="#F7ECE3"
                    _hover={{ bg: "#FFF5ED" }}
                    cursor="pointer"
                    onClick={() => {
                      const nextPos = { lat: item.lat, lng: item.lng };
                      setPosition(nextPos);
                      setAddress(item.label);
                      setSearchResults([]);
                      if (mapInstanceRef.current && markerRef.current) {
                        markerRef.current.setPosition(nextPos);
                        mapInstanceRef.current.panTo(nextPos);
                        mapInstanceRef.current.setZoom(16);
                      }
                    }}
                  >
                    <Box mt="2px" color="#C95C18" flexShrink={0}>
                      <LuMapPin size={14} />
                    </Box>
                    <Text fontSize="12.5px" color="#202938">
                      {item.label}
                    </Text>
                  </Flex>
                ))}
              </Box>
            )}

            {error && (
              <Text fontSize="12.5px" color="#C95C18" bg="#FFF5ED" px={3} py={2} borderRadius="6px" mb={3}>
                {error}
              </Text>
            )}

            {loading && (
              <Flex align="center" justify="center" h="300px" bg="#FFFBF8" borderRadius="8px">
                <Text fontSize="13px" color="fg.muted">
                  Loading map...
                </Text>
              </Flex>
            )}

            {mapsReady ? (
              <Box
                ref={mapRef}
                width="100%"
                height="300px"
                borderRadius="8px"
                borderWidth="1px"
                borderColor="#F1E3D9"
                overflow="hidden"
                display={loading ? "none" : "block"}
              />
            ) : (
              !loading &&
              position && (
                <Box
                  as="iframe"
                  title="Selected Location Preview"
                  width="100%"
                  height="260px"
                  borderRadius="8px"
                  borderWidth="1px"
                  borderColor="#F1E3D9"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    position.lng - 0.01
                  }%2C${position.lat - 0.01}%2C${position.lng + 0.01}%2C${
                    position.lat + 0.01
                  }&layer=mapnik&marker=${position.lat}%2C${position.lng}`}
                />
              )
            )}

            {position && !loading && (
              <Text fontSize="12px" color="fg.muted" mt={2}>
                {address
                  ? `${address} (${Number(position.lat).toFixed(5)}, ${Number(
                      position.lng
                    ).toFixed(5)})`
                  : `${Number(position.lat).toFixed(6)}, ${Number(
                      position.lng
                    ).toFixed(6)}`}
              </Text>
            )}
          </Dialog.Body>

          <Dialog.Footer
            px="24px"
            py="16px"
            borderTopWidth="1px"
            borderColor="#F0E9E5"
            gap={3}
          >
            <Button type="button" variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              colorPalette="brand"
              onClick={handleConfirm}
              disabled={!position}
            >
              Confirm
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
