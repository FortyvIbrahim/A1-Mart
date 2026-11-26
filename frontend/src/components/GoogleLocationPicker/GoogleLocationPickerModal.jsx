"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Text,
  Flex,
  Box,
} from "@chakra-ui/react";
import { loadGoogleMaps } from "./loadGoogleMaps";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
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
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const placeAutocompleteRef = useRef(null);

  const initial = parseLocationValue(initialValue);
  const [position, setPosition] = useState(initial);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetState = useCallback(() => {
    setPosition(initial);
    setAddress(initial?.address ?? "");
    setError("");
  }, [initial?.lat, initial?.lng, initial?.address]);

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
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [isOpen, initialValue]);

  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError("");
    loadGoogleMaps()
      .then((google) => {
        if (!google?.maps) return;
        setMapsReady(true);
      })
      .catch(() => {
        setError("Failed to load Google Maps. Check API key.");
      })
      .finally(() => {
        setLoading(false);
      });
    return () => setMapsReady(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mapsReady) return;

    const google = window.google;
    if (!google?.maps?.importLibrary) return;

    let cancelled = false;
    let geocodeTimeoutId = null;
    const GEOCODE_DEBOUNCE_MS = 500;

    const runReverseGeocode = (location) => {
      if (cancelled) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (cancelled) return;
        if (status === "OK" && results?.[0]) {
          setAddress(results[0].formatted_address);
        } else {
          setAddress("");
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
          colorScheme: ColorScheme.LIGHT,
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

        const { PlaceAutocompleteElement } = await google.maps.importLibrary(
          "places"
        );
        if (cancelled || !autocompleteContainerRef.current) return;

        const placeAutocomplete = new PlaceAutocompleteElement({
          types: ["establishment", "geocode"],
        });
        autocompleteContainerRef.current.innerHTML = "";
        autocompleteContainerRef.current.appendChild(placeAutocomplete);

        placeAutocomplete.placeholder = "Search for a location";
        placeAutocomplete.style = "border: 1px solid #e2e8f0";
        placeAutocompleteRef.current = placeAutocomplete;

        placeAutocomplete.addEventListener("gmp-select", async (e) => {
          if (cancelled) return;
          const placePrediction =
            e.placePrediction ?? e.detail?.placePrediction;
          const place = placePrediction?.toPlace?.();
          if (!place) return;
          await place.fetchFields({
            fields: ["formattedAddress", "location"],
          });
          const loc = place.location;
          if (!loc) return;
          const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
          const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
          const latLng = { lat, lng };
          setPosition({ lat, lng });
          setAddress(place.formattedAddress ?? "");
          marker.setPosition(latLng);
          map.panTo(latLng);
          if (map.getDiv) google.maps.event.trigger(map, "resize");
        });

        if (position) {
          map.panTo(center);
        }

        const resizeWhenVisible = () => {
          if (mapRef.current && map.getDiv?.()?.offsetParent != null) {
            google.maps.event.trigger(map, "resize");
            map.panTo(map.getCenter());
          }
        };
        setTimeout(resizeWhenVisible, 100);
        setTimeout(resizeWhenVisible, 500);
      } catch (err) {
        if (!cancelled) setError("Failed to load map or places.");
      }
    })();

    return () => {
      cancelled = true;
      if (geocodeTimeoutId) clearTimeout(geocodeTimeoutId);
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

  const handleConfirm = useCallback(() => {
    if (position) {
      onSelect({
        lat: position.lat,
        lng: position.lng,
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
    <Flex
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      justifyContent="center"
      alignItems="center"
      h="100dvh"
    >
      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
        <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DialogContent
          mx={4}
          borderRadius="8px"
          overflow="hidden"
          maxW="90vw"
          w="640px"
        >
          <DialogHeader pb={2}>
            <Text fontSize="md" fontWeight="semibold" color="gray.800">
              Select location on map
            </Text>
          </DialogHeader>
          <DialogBody pt={0} pb={4}>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Search for a place or click on the map to set the marker.
            </Text>
            <Box
              ref={autocompleteContainerRef}
              mb={3}
              minH="40px"
              sx={{ colorScheme: "light" }}
            />
            {error && (
              <Text fontSize="sm" color="red.500" mb={2}>
                {error}
              </Text>
            )}
            {loading && (
              <Flex align="center" justify="center" h="300px">
                <Text color="gray.500">Loading map...</Text>
              </Flex>
            )}
            <Box
              ref={mapRef}
              width="100%"
              height="300px"
              borderRadius="8px"
              overflow="hidden"
              display={loading ? "none" : "block"}
            />
            {position && !loading && (
              <Text fontSize="xs" color="gray.500" mt={2}>
                {address ||
                  `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`}
              </Text>
            )}
          </DialogBody>
          <DialogFooter pt={2} gap={3}>
            <Button variant="outline" colorScheme="gray" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorPalette="brand"
              onClick={handleConfirm}
              disabled={!position}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog.Root>
    </Flex>
  );
}
