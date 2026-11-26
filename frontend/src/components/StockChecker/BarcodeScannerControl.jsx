"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import CustomDialog from "@/components/CustomDialog";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  NativeSelect,
  Text,
} from "@chakra-ui/react";
import { FaBarcode } from "react-icons/fa";
import toast from "react-hot-toast";
import { normalizeEan } from "@/utils/stockChecker";
import {
  guessCameraFacingFromLabel,
  isAndroidDevice,
  isAppleTouchDevice,
  applyInlinePlaybackToScannerVideo,
  applyVideoTrackAutofocusBestEffort,
  patchScannerVideoElements,
  scheduleScannerVideoAutofocusOnVideo,
} from "@/utils/barcodeScannerPlatform";
import { ensureGetUserMediaPolyfill } from "@/utils/mediaDevicesCamera";

/**
 * Barcode scan trigger (button), optional active EAN chip with clear, and camera dialog.
 * Calls `onBarcodeFound` with the raw decoded string when a code is read successfully.
 *
 * @param {(decodedText: string) => void} props.onBarcodeFound
 * @param {string | null | undefined} [props.activeEan] — When set, shows EAN label and Clear
 * @param {() => void} [props.onClear] — Invoked when Clear is pressed (required if activeEan is shown)
 * @param {string} [props.scanButtonAriaLabel] — Used only for the default trigger (barcode icon button)
 * @param {import('react').ReactElement} [props.trigger] — Custom element that opens the scanner when clicked (merged onClick)
 * @param {string} [props.dialogTitle]
 * @param {string} [props.hintText]
 */
function BarcodeScannerControl({
  onBarcodeFound,
  activeEan,
  onClear,
  scanButtonAriaLabel = "Scan barcode",
  trigger = null,
  dialogTitle = "Scan barcode",
  hintText = "Point the camera at the barcode.",
}) {
  const [scannerOpen, setScannerOpen] = useState(false);
  /** null = loading, [] = failed/none */
  const [cameraList, setCameraList] = useState(null);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const regionId = `barcode-scanner-${useId().replace(/:/g, "")}`;
  const scannerInstanceRef = useRef(null);
  const scannerAutofocusCleanupRef = useRef(() => {});
  const lastTapRefocusAtRef = useRef(0);
  const onBarcodeFoundRef = useRef(onBarcodeFound);
  onBarcodeFoundRef.current = onBarcodeFound;

  const isTouchApple = isAppleTouchDevice();
  const isAndroid = isAndroidDevice();

  useEffect(() => {
    if (!scannerOpen) {
      setCameraList(null);
      setSelectedCameraId("");
    }
  }, [scannerOpen]);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const cams = await Html5Qrcode.getCameras();
        if (cancelled) return;
        const list = cams.map((c) => ({
          id: c.id,
          label:
            String(c.label || "").trim() ||
            `Camera ${String(c.id).slice(0, 12)}…`,
          facing: guessCameraFacingFromLabel(c.label),
        }));
        setCameraList(list);
        const backPreferred =
          list.find((c) => c.facing === "back") ||
          list.find((c) => /back|rear|environment|ultra|wide/i.test(c.label)) ||
          list[0];
        if (backPreferred) setSelectedCameraId(backPreferred.id);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setCameraList([]);
          toast.error("Could not load cameras.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scannerOpen]);

  /**
   * Open the scanner modal. On Android, Chrome only shows the permission prompt if
   * getUserMedia runs in the same user gesture as the tap — so we request a
   * minimal stream here, stop it, then open the modal. iOS keeps modal-only flow
   * to avoid double-acquire issues with the camera.
   */
  const openScannerModal = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!window.isSecureContext) {
      toast.error(
        "Camera needs a secure page. Use https:// (or localhost for dev)."
      );
      return;
    }

    ensureGetUserMediaPolyfill();
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera is not available in this browser.");
      return;
    }

    const open = () => setScannerOpen(true);

    if (isAndroid) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          stream.getTracks().forEach((t) => t.stop());
          open();
        })
        .catch((err) => {
          console.error(err);
          const name = err?.name || "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            toast.error(
              "Camera permission was denied. Allow camera in your browser settings for this site."
            );
          } else if (
            name === "NotFoundError" ||
            name === "DevicesNotFoundError"
          ) {
            toast.error("No camera was found.");
          } else {
            toast.error("Could not access the camera.");
          }
        });
      return;
    }

    open();
  }, [isAndroid]);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    if (cameraList === null) return undefined;
    if (cameraList.length > 0 && !selectedCameraId) return undefined;

    let cancelled = false;
    let detachVideoPatch = () => {};
    scannerAutofocusCleanupRef.current = () => {};

    const stopInstance = async () => {
      const instance = scannerInstanceRef.current;
      scannerInstanceRef.current = null;
      if (!instance) return;
      try {
        await instance.stop();
        instance.clear();
      } catch {
        /* already stopped */
      }
    };

    const isIOS = isTouchApple;
    const startDelayMs = isIOS ? 80 : 150;

    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      const container = document.getElementById(regionId);
      if (!container) {
        if (!cancelled) {
          toast.error("Scanner could not start. Try again.");
          setScannerOpen(false);
        }
        return;
      }

      detachVideoPatch = patchScannerVideoElements(container, (video) => {
        scannerAutofocusCleanupRef.current();
        scannerAutofocusCleanupRef.current =
          scheduleScannerVideoAutofocusOnVideo(video);
      });

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );
        if (cancelled) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ];

        /*
         * iOS WebKit: prefer 1080p-class stream when available — more pixels on the
         * barcode when the phone is farther away (small in frame).
         */
        const iosResolution = {
          width: { min: 320, ideal: 1920, max: 1920 },
          height: { min: 240, ideal: 1080, max: 1080 },
        };
        /**
         * html5-qrcode uses `configuration.videoConstraints` when set and ignores
         * `cameraIdOrConfig`. Our iOS-only width/height constraints therefore broke
         * device selection from the dropdown — merge deviceId or facingMode into
         * the same object so the chosen camera actually drives getUserMedia.
         */
        const nonIosResolution = {
          width: { min: 640, ideal: 1920, max: 1920 },
          height: { min: 480, ideal: 1080, max: 1080 },
        };

        const scanConfigForCamera = (cameraOrConfig) => {
          /*
           * Omit `qrbox`: html5-qrcode then decodes the full viewfinder. A small
           * fixed qrbox only cropped the center (~280×150px) and required the label
           * to fill that strip — bad for normal arm’s-length / shelf distance.
           */
          const base = {
            fps: 12,
            formatsToSupport,
            disableFlip: isIOS,
          };
          if (!isIOS) {
            if (typeof cameraOrConfig === "string") {
              return {
                ...base,
                videoConstraints: {
                  deviceId: { exact: cameraOrConfig },
                  ...nonIosResolution,
                },
              };
            }
            return {
              ...base,
              videoConstraints: {
                ...cameraOrConfig,
                ...nonIosResolution,
              },
            };
          }
          if (typeof cameraOrConfig === "string") {
            return {
              ...base,
              videoConstraints: {
                deviceId: { exact: cameraOrConfig },
                ...iosResolution,
              },
            };
          }
          return {
            ...base,
            videoConstraints: {
              ...cameraOrConfig,
              ...iosResolution,
            },
          };
        };

        const onDecoded = (decodedText) => {
          if (cancelled) return;
          void stopInstance();
          onBarcodeFoundRef.current?.(decodedText);
          setScannerOpen(false);
        };

        const tryStart = async (html5, cameraOrConfig) => {
          await html5.start(
            cameraOrConfig,
            scanConfigForCamera(cameraOrConfig),
            onDecoded,
            () => {}
          );
        };

        const runWithFallbacks = async () => {
          let html5 = new Html5Qrcode(regionId, { verbose: false });
          scannerInstanceRef.current = html5;

          const fallbacks = [];

          if (selectedCameraId && cameraList && cameraList.length > 0) {
            fallbacks.push(selectedCameraId);
          }

          fallbacks.push(
            { facingMode: { ideal: "environment" } },
            { facingMode: "environment" },
            { facingMode: "user" }
          );

          let lastErr;
          for (const cam of fallbacks) {
            if (cancelled) return;
            try {
              await tryStart(html5, cam);
              if (!cancelled) {
                const v = container.querySelector("video");
                if (v) {
                  applyInlinePlaybackToScannerVideo(v);
                  scannerAutofocusCleanupRef.current();
                  scannerAutofocusCleanupRef.current =
                    scheduleScannerVideoAutofocusOnVideo(v);
                }
              }
              return;
            } catch (e) {
              lastErr = e;
              console.warn("BarcodeScannerControl camera attempt failed", e);
              try {
                html5.clear();
              } catch {
                /* start() may have failed before the scanner was running */
              }
              html5 = new Html5Qrcode(regionId, { verbose: false });
              scannerInstanceRef.current = html5;
            }
          }

          throw lastErr || new Error("Could not start any camera");
        };

        await runWithFallbacks();
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const name =
            e && typeof e === "object" && "name" in e ? String(e.name) : "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            toast.error(
              "Camera access was denied. iPhone: allow Camera for this site (Safari: aA → Website Settings; Chrome: ⋯ → Settings) or iOS Settings → Safari/Chrome → Camera."
            );
          } else if (
            name === "NotFoundError" ||
            name === "DevicesNotFoundError"
          ) {
            toast.error("No camera was found on this device.");
          } else {
            toast.error(
              "Could not start the camera. Check permissions and try again."
            );
          }
          setScannerOpen(false);
        }
      }
    }, startDelayMs);

    return () => {
      cancelled = true;
      scannerAutofocusCleanupRef.current();
      scannerAutofocusCleanupRef.current = () => {};
      window.clearTimeout(timer);
      detachVideoPatch();
      void stopInstance();
    };
  }, [scannerOpen, regionId, isTouchApple, cameraList, selectedCameraId]);

  const showActive = activeEan != null && String(activeEan).length > 0;

  const defaultTrigger = (
    <IconButton
      aria-label={scanButtonAriaLabel}
      variant="outline"
      size="sm"
      onClick={() => openScannerModal()}
    >
      <FaBarcode />
    </IconButton>
  );

  const triggerEl =
    trigger != null && React.isValidElement(trigger)
      ? React.cloneElement(trigger, {
          onClick: (event) => {
            trigger.props.onClick?.(event);
            if (event?.defaultPrevented) return;
            openScannerModal();
          },
        })
      : defaultTrigger;

  const onScannerPreviewPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const now = Date.now();
    if (now - lastTapRefocusAtRef.current < 450) return;
    lastTapRefocusAtRef.current = now;
    const v = e.currentTarget.querySelector("video");
    const track = v?.srcObject?.getVideoTracks?.()?.[0];
    if (track) void applyVideoTrackAutofocusBestEffort(track);
  }, []);

  return (
    <>
      <HStack gap={2} flexWrap="wrap" justify="flex-end">
        {showActive && (
          <HStack gap={1} align="center">
            <Text fontSize="xs" color="gray.700" maxW="160px" truncate>
              EAN: {normalizeEan(activeEan)}
            </Text>
            {onClear ? (
              <Button size="xs" variant="ghost" onClick={onClear}>
                Clear
              </Button>
            ) : null}
          </HStack>
        )}
        {triggerEl}
      </HStack>

      <CustomDialog
        open={scannerOpen}
        onOpenChange={(e) => {
          if (!e.open) {
            setScannerOpen(false);
            setCameraList(null);
            setSelectedCameraId("");
          }
        }}
        title={dialogTitle}
        maxW="min(100vw - 32px, 420px)"
        maxH="min(100dvh - 16px, 92vh)"
        contentProps={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        bodyProps={{
          flex: "1",
          minH: "0",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "hidden",
          py: 2,
        }}
        footer={
          <Button variant="outline" onClick={() => setScannerOpen(false)}>
            Cancel
          </Button>
        }
      >
        <Flex direction="column" gap={2} minH="0" flex="1" w="100%">
          <Text fontSize="sm" color="gray.600" flexShrink={0}>
            {hintText}
          </Text>
          {cameraList === null ? (
            <Text fontSize="sm" color="gray.600" flexShrink={0}>
              Loading cameras…
            </Text>
          ) : cameraList.length === 0 ? (
            <Text fontSize="sm" color="orange.600" flexShrink={0}>
              Camera list unavailable. The scanner will try default cameras.
            </Text>
          ) : null}
          {cameraList && cameraList.length > 0 ? (
            <Box flexShrink={0}>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Camera
              </Text>
              <NativeSelect.Root width="100%">
                <NativeSelect.Field
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                >
                  {cameraList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          ) : null}

          <Box
            id={regionId}
            position="relative"
            w="100%"
            minH="120px"
            maxH="min(34vh, 200px)"
            h="min(34vh, 200px)"
            borderRadius="md"
            overflow="hidden"
            bg="blackAlpha.100"
            isolation="isolate"
            flexShrink={1}
            onPointerDownCapture={onScannerPreviewPointerDown}
            css={{
              contain: "strict",
              "& video": {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              },
              "& video::-webkit-media-controls": { display: "none" },
              "& video::-webkit-media-controls-start-playback-button": {
                display: "none",
              },
            }}
          />
        </Flex>
      </CustomDialog>
    </>
  );
}

export default BarcodeScannerControl;
