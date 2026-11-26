/**
 * Safari / older WebKit: polyfill `navigator.mediaDevices.getUserMedia` from legacy APIs.
 * @returns {boolean} true if getUserMedia is available after polyfill
 */
export function ensureGetUserMediaPolyfill() {
  if (typeof navigator === "undefined") return false;

  const nav = navigator;

  if (nav.mediaDevices?.getUserMedia) {
    return true;
  }

  const legacy =
    nav.webkitGetUserMedia ||
    nav.mozGetUserMedia ||
    nav.msGetUserMedia;

  if (!legacy) {
    return false;
  }

  if (!nav.mediaDevices) {
    try {
      // eslint-disable-next-line no-param-reassign
      nav.mediaDevices = {};
    } catch {
      return false;
    }
  }

  if (!nav.mediaDevices.getUserMedia) {
    // eslint-disable-next-line no-param-reassign
    nav.mediaDevices.getUserMedia = function (constraints) {
      return new Promise((resolve, reject) => {
        legacy.call(nav, constraints, resolve, reject);
      });
    };
  }

  return true;
}
