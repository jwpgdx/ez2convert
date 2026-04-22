import { orientation } from "exifr/dist/lite.esm.js";

function normalizeOrientation(value) {
  if (Number.isInteger(value) && value >= 1 && value <= 8) {
    return value;
  }
  return 1;
}

export async function readJpegOrientation(file) {
  try {
    const value = await orientation(file);
    return normalizeOrientation(value);
  } catch {
    return 1;
  }
}

export function getOrientedDimensions(width, height, orientation) {
  if ([5, 6, 7, 8].includes(orientation)) {
    return { width: height, height: width };
  }
  return { width, height };
}

export function applyOrientationTransform(ctx, orientation, width, height) {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }
}
