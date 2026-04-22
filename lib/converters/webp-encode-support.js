let supportCheckPromise = null;

export async function checkWebpEncodeSupport() {
  if (typeof document === "undefined") {
    return false;
  }

  if (!supportCheckPromise) {
    supportCheckPromise = (async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;

        if (typeof canvas.toBlob !== "function") {
          return false;
        }

        return await new Promise((resolve) => {
          let settled = false;
          const timeoutId = window.setTimeout(() => {
            if (settled) {
              return;
            }
            settled = true;
            resolve(false);
          }, 1500);

          canvas.toBlob(
            (blob) => {
              if (settled) {
                return;
              }
              settled = true;
              window.clearTimeout(timeoutId);
              resolve(Boolean(blob) && blob.type === "image/webp");
            },
            "image/webp",
            0.8
          );
        });
      } catch {
        return false;
      }
    })();
  }

  return supportCheckPromise;
}
