import { createEngineError } from "./errors";
import { ERROR_CODES } from "../../constants/error-codes";

export function applyAlphaBackground(canvas, backgroundHex) {
  const context = canvas?.getContext?.("2d");
  if (!context) {
    throw createEngineError(ERROR_CODES.ENCODE_FAILED);
  }

  context.save();
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = String(backgroundHex || "#FFFFFF");
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();

  return canvas;
}
