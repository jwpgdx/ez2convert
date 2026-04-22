import { MIME_TYPES } from "../config/file-types";

let supportCheckPromise = null;

function createProbeImageData() {
  return new ImageData(
    new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]),
    2,
    2
  );
}

export async function checkJpgEncodeSupport() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!supportCheckPromise) {
    supportCheckPromise = (async () => {
      try {
        const encodeJpeg = await import("@jsquash/jpeg/encode").then(
          (module) => module.default
        );
        const probeImageData = createProbeImageData();

        const encoded = await Promise.race([
          encodeJpeg(probeImageData, {
            quality: 80,
            progressive: true,
          }),
          new Promise((resolve) =>
            window.setTimeout(() => resolve(null), 3000)
          ),
        ]);

        if (!(encoded instanceof ArrayBuffer)) {
          return false;
        }

        const blob = new Blob([encoded], { type: MIME_TYPES.JPEG });
        return blob.size > 0 && blob.type === MIME_TYPES.JPEG;
      } catch {
        return false;
      }
    })();
  }

  return supportCheckPromise;
}
