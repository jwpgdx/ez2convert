let encodePromise = null;

async function getEncoder() {
  if (!encodePromise) {
    encodePromise = import("@jsquash/avif/encode")
      .then((module) => module.default)
      .catch(() => {
        const error = new Error("AVIF_LOAD_FAILED");
        error.code = "AVIF_LOAD_FAILED";
        throw error;
      });
  }

  return encodePromise;
}

self.onmessage = async (event) => {
  const message = event?.data;
  if (!message || message.type !== "encode") {
    return;
  }

  const { id, data, width, height, options } = message;

  try {
    const encode = await getEncoder();
    const encodedBuffer = await encode({ data, width, height }, options || {});

    if (!(encodedBuffer instanceof ArrayBuffer)) {
      throw new Error("AVIF_ENCODE_FAILED");
    }

    self.postMessage(
      {
        id,
        ok: true,
        buffer: encodedBuffer,
      },
      [encodedBuffer]
    );
  } catch (error) {
    const code = error?.code || error?.message;
    const errorCode =
      code === "AVIF_LOAD_FAILED" ? "AVIF_LOAD_FAILED" : "AVIF_ENCODE_FAILED";

    self.postMessage({
      id,
      ok: false,
      errorCode,
    });
  }
};
