function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createFileItem(file, metadata = {}) {
  return {
    id: createId(),
    file,
    input: {
      name: file.name,
      type: file.type,
      detectedType: metadata.detectedType || null,
      isAnimated: Boolean(metadata.isAnimated),
      isVideo: Boolean(metadata.isVideo),
      size: file.size,
      lastModified: file.lastModified,
      width: null,
      height: null,
    },
    status: "pending",
    error: null,
    output: {
      blob: null,
      url: null,
      name: null,
      size: null,
      width: null,
      height: null,
    },
  };
}
