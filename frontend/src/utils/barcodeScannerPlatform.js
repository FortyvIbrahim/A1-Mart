/**
 * Best-effort facing from device label (browser labels vary).
 * @returns {"back" | "front" | "unknown"}
 */
export function guessCameraFacingFromLabel(label) {
  const l = String(label || "").toLowerCase();
  if (/back|rear|environment|ultra|wide|telephoto|triple|dual/i.test(l)) {
    return "back";
  }
  if (/front|user|face|selfie|facetime|true\s*depth/i.test(l)) {
    return "front";
  }
  return "unknown";
}

/**
 * Android phones / tablets (Chrome, WebView, etc.).
 */
export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

/**
 * iPad / iPhone / iPod touch (incl. iPadOS desktop UA).
 */
export function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return (
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  );
}

/**
 * iPhone / iPad / iPod WebKit (Safari, **Chrome**, Firefox, Edge — all use WKWebView on iOS).
 */
export function isAppleWebKitMobile() {
  return isAppleTouchDevice() && !isAndroidDevice();
}

/** Avoid duplicate fullscreen guards / metadata hooks per `<video>` node */
const iosInlineGuardsAttached = new WeakSet();

/**
 * Force inline playback on the scanner `<video>` (critical on iOS WebKit: Safari,
 * Chrome, Edge — all use WKWebView). html5-qrcode sets `playsInline` but often
 * omits attributes; without them, iOS can open the native fullscreen player.
 * Call this as soon as the element exists and again after `srcObject` is set.
 *
 * @param {HTMLVideoElement | null} v
 */
export function applyInlinePlaybackToScannerVideo(v) {
  if (!v || v.tagName !== "VIDEO") return;

  /* Boolean attributes + legacy WebKit alias — required for inline camera on iPhone */
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
  v.setAttribute("x5-playsinline", "true");
  v.playsInline = true;
  v.muted = true;
  v.defaultMuted = true;
  v.autoplay = true;

  v.controls = false;
  v.removeAttribute("controls");

  if ("disablePictureInPicture" in v) {
    try {
      v.disablePictureInPicture = true;
    } catch {
      /* */
    }
  }
  if ("disableRemotePlayback" in v) {
    try {
      v.disableRemotePlayback = true;
    } catch {
      /* */
    }
  }

  try {
    v.setAttribute("controlsList", "nodownload nofullscreen noremoteplayback");
  } catch {
    /* */
  }

  v.style.objectFit = "cover";
  v.style.width = "100%";
  v.style.height = "100%";
  v.style.maxWidth = "100%";
  v.style.maxHeight = "100%";

  if (isAppleWebKitMobile() && !iosInlineGuardsAttached.has(v)) {
    iosInlineGuardsAttached.add(v);
    const blockFullscreen = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    v.addEventListener("webkitbeginfullscreen", blockFullscreen, true);
    v.addEventListener("webkitendfullscreen", blockFullscreen, true);
  }

  const reapply = () => applyInlinePlaybackToScannerVideo(v);
  if (!v.dataset.barcodeScannerInlineHook) {
    v.dataset.barcodeScannerInlineHook = "1";
    v.addEventListener("loadedmetadata", reapply);
    v.addEventListener("loadeddata", reapply);
  }
}

/**
 * Keeps html5-qrcode camera preview inline inside the page. Important for:
 * iOS Safari, Android Chrome, and especially React Native / native WebViews that
 * otherwise open camera preview fullscreen with native controls.
 *
 * React Native WebView: also set `allowsInlineMediaPlayback={true}` (iOS) on the WebView.
 *
 * @param {HTMLElement | null} containerEl
 * @param {(video: HTMLVideoElement) => void} [onVideoPatched] — called after each video is patched (e.g. autofocus)
 * @returns {() => void} disconnect observer
 */
export function patchScannerVideoElements(containerEl, onVideoPatched) {
  if (!containerEl || typeof MutationObserver === "undefined") {
    return () => {};
  }

  const apply = () => {
    containerEl.querySelectorAll?.("video").forEach((v) => {
      applyInlinePlaybackToScannerVideo(v);
      if (typeof onVideoPatched === "function") {
        onVideoPatched(v);
      }
    });
  };

  apply();
  const obs = new MutationObserver(() => apply());
  obs.observe(containerEl, { childList: true, subtree: true });
  return () => obs.disconnect();
}

/**
 * Best-effort continuous focus on the live video track. Browsers only honor
 * values reported by getCapabilities(); "ideal" in getUserMedia is often ignored.
 *
 * @param {MediaStreamTrack | null | undefined} track
 * @returns {Promise<void>}
 */
export async function applyVideoTrackAutofocusBestEffort(track) {
  if (!track || typeof track.applyConstraints !== "function") return;

  const tryApply = async (constraints) => {
    try {
      await track.applyConstraints(constraints);
      return true;
    } catch {
      return false;
    }
  };

  let caps = {};
  try {
    caps =
      typeof track.getCapabilities === "function"
        ? track.getCapabilities()
        : {};
  } catch {
    caps = {};
  }

  const focusModes = caps.focusMode;
  const exposureModes = caps.exposureMode;

  const pickFocusMode = () => {
    if (!Array.isArray(focusModes) || focusModes.length === 0) return null;
    if (focusModes.includes("continuous")) return "continuous";
    if (focusModes.includes("single-shot")) return "single-shot";
    if (focusModes.includes("manual")) return "manual";
    return null;
  };

  const primary = {};
  const fm = pickFocusMode();
  if (fm) primary.focusMode = fm;

  if (
    Array.isArray(exposureModes) &&
    exposureModes.includes("continuous")
  ) {
    primary.exposureMode = "continuous";
  }

  if (Object.keys(primary).length > 0) {
    await tryApply(primary);
  }

  /* Kick a focus cycle then lock — helps some Android cameras */
  if (
    Array.isArray(focusModes) &&
    focusModes.includes("single-shot") &&
    focusModes.includes("continuous")
  ) {
    await tryApply({ focusMode: "single-shot" });
    await new Promise((r) => setTimeout(r, 150));
    await tryApply({ focusMode: "continuous" });
  }

  const fd = caps.focusDistance;
  const hasFocusDistance =
    fd &&
    typeof fd.min === "number" &&
    typeof fd.max === "number" &&
    fd.max > fd.min;

  if (hasFocusDistance) {
    const span = fd.max - fd.min;
    /* Typical barcode distance: closer than infinity; bias toward near field */
    const distance = fd.min + span * 0.22;
    /*
     * If the driver reports no focusMode, distance may be the only control.
     * If it reports continuous AF, avoid mixing distance in the same tick — it
     * can fight the AF motor on some phones.
     */
    if (!Array.isArray(focusModes) || focusModes.length === 0) {
      await tryApply({ focusDistance: distance });
    } else if (isAndroidDevice()) {
      void new Promise((r) => setTimeout(r, 450)).then(() =>
        tryApply({ focusDistance: distance })
      );
    }
  }

  /*
   * iOS WebKit: no focusMode on the track; AF is system-managed. Do not apply
   * digital zoom here — zoom narrows the field of view and hurts scanning at
   * arm’s length / distance.
   */
  if (isAppleWebKitMobile()) {
    return;
  }

  await tryApply({ advanced: [{ focusMode: "continuous" }] });
  await tryApply({ focusMode: { ideal: "continuous" } });

  if (typeof ImageCapture !== "undefined") {
    try {
      const ic = new ImageCapture(track);
      if (typeof ic.getPhotoCapabilities === "function") {
        const pc = await ic.getPhotoCapabilities();
        const opts = {};
        if (
          Array.isArray(pc.focusMode) &&
          pc.focusMode.includes("continuous")
        ) {
          opts.focusMode = "continuous";
        }
        if (
          Array.isArray(pc.exposureMode) &&
          pc.exposureMode.includes("continuous")
        ) {
          opts.exposureMode = "continuous";
        }
        if (Object.keys(opts).length && typeof ic.setOptions === "function") {
          await ic.setOptions(opts);
        }
      }
    } catch {
      /* */
    }
  }
}

/**
 * Re-run autofocus when the stream attaches and while the preview stabilizes.
 * @param {HTMLVideoElement | null} videoEl
 * @returns {() => void} cancel pending work
 */
export function scheduleScannerVideoAutofocusOnVideo(videoEl) {
  if (!videoEl) return () => {};

  const run = () => {
    const stream = videoEl.srcObject;
    const track = stream?.getVideoTracks?.()?.[0];
    if (track) void applyVideoTrackAutofocusBestEffort(track);
  };

  run();
  videoEl.addEventListener("loadedmetadata", run, { once: true });
  videoEl.addEventListener("playing", run, { once: true });

  const delays = isAppleWebKitMobile()
    ? [50, 200, 600]
    : [40, 120, 300, 700, 1500, 2800];
  const ids = delays.map((ms) => setTimeout(run, ms));

  return () => {
    ids.forEach(clearTimeout);
  };
}

/** @deprecated Use patchScannerVideoElements */
export const patchScannerVideosForIOS = patchScannerVideoElements;
