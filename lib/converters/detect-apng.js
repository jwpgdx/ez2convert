const PNG_SIGNATURE = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
];

function isPngSignature(view) {
  if (view.byteLength < PNG_SIGNATURE.length) {
    return false;
  }

  return PNG_SIGNATURE.every((value, index) => view.getUint8(index) === value);
}

export function detectApng(arrayBuffer) {
  const view = new DataView(arrayBuffer);

  if (!isPngSignature(view)) {
    return false;
  }

  let offset = 8;
  while (offset + 8 <= view.byteLength) {
    const chunkLength = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    if (type === "acTL") {
      return true;
    }
    if (type === "IEND") {
      return false;
    }

    offset += 12 + chunkLength;
    if (offset > view.byteLength) {
      return false;
    }
  }

  return false;
}
