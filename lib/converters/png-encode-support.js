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

export async function checkPngEncodeSupport() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!supportCheckPromise) {
    supportCheckPromise = (async () => {
      try {
        const { optimise } = await import("@jsquash/oxipng");
        const probeImageData = createProbeImageData();

        const encoded = await Promise.race([
          optimise(probeImageData, {
            level: 1,
            interlace: false,
            optimiseAlpha: true,
          }),
          new Promise((resolve) =>
            window.setTimeout(() => resolve(null), 3000)
          ),
        ]);

        if (!(encoded instanceof ArrayBuffer)) {
          return false;
        }

        const blob = new Blob([encoded], { type: MIME_TYPES.PNG });
        return blob.size > 0 && blob.type === MIME_TYPES.PNG;
      } catch {
        return false;
      }
    })();
  }

  return supportCheckPromise;
}
