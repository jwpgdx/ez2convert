import { ERROR_CODES } from "../constants/error-codes";
export { ERROR_CODES } from "../constants/error-codes";

export const ERROR_MESSAGES = Object.freeze({
  [ERROR_CODES.UNSUPPORTED_TYPE]:
    "Unsupported file format. Allowed: JPG/JPEG, PNG, GIF/APNG, common video formats.",
  [ERROR_CODES.UNSUPPORTED_ANIMATED_IMAGE]:
    "Animated images are not supported in this conversion path.",
  [ERROR_CODES.EXCEEDS_FILE_SIZE_LIMIT]:
    "File size limit exceeded. (max 50MB)",
  [ERROR_CODES.EXCEEDS_DIMENSION_LIMIT]:
    "Image dimension limit exceeded. (max 8192px)",
  [ERROR_CODES.EXCEEDS_PIXEL_LIMIT]:
    "Image pixel limit exceeded. (max 25MP)",
  [ERROR_CODES.EXCEEDS_VIDEO_DURATION_LIMIT]:
    "Video duration limit exceeded. (max 120 sec)",
  [ERROR_CODES.EXCEEDS_VIDEO_FRAMES_LIMIT]:
    "Estimated video frame count exceeded. Lower FPS or trim video.",
  [ERROR_CODES.EXCEEDS_BATCH_FILES_LIMIT]:
    "Too many files in one batch. (max 50 files)",
  [ERROR_CODES.WEBP_ENCODE_UNSUPPORTED]:
    "This browser does not support required WebP encoding features.",
  [ERROR_CODES.PNG_ENCODE_UNSUPPORTED]:
    "This browser does not support required PNG encoding features.",
  [ERROR_CODES.JPG_ENCODE_UNSUPPORTED]:
    "This browser does not support required JPG encoding features.",
  [ERROR_CODES.DECODE_FAILED]: "Failed to decode input file.",
  [ERROR_CODES.ENCODE_FAILED]: "Failed to encode WebP output.",
  [ERROR_CODES.JPEG_LOAD_FAILED]:
    "Failed to load JPEG encoder engine.",
  [ERROR_CODES.JPEG_ENCODE_FAILED]:
    "Failed to encode JPG output.",
  [ERROR_CODES.JPEG_FALLBACK_FAILED]:
    "JPG fallback encoder also failed.",
  [ERROR_CODES.AVIF_LOAD_FAILED]:
    "Failed to load AVIF encoder engine.",
  [ERROR_CODES.AVIF_ENCODE_FAILED]:
    "Failed to encode AVIF output.",
  [ERROR_CODES.GIF_LOAD_FAILED]:
    "Failed to load GIF encoder engine.",
  [ERROR_CODES.GIF_ENCODE_FAILED]:
    "Failed to encode GIF output.",
  [ERROR_CODES.FFMPEG_LOAD_FAILED]:
    "Failed to load ffmpeg engine for animated/video conversion.",
  [ERROR_CODES.ANIMATED_ENCODE_FAILED]:
    "Failed to encode animated WebP output.",
  [ERROR_CODES.VIDEO_ENCODE_FAILED]:
    "Failed to encode video to WebP output.",
  [ERROR_CODES.ANIMATED_GIF_ENCODE_FAILED]:
    "Failed to encode animated GIF output.",
  [ERROR_CODES.VIDEO_GIF_ENCODE_FAILED]:
    "Failed to encode video to GIF output.",
  [ERROR_CODES.VIDEO_PIPELINE_NOT_READY]:
    "Video to WebP pipeline is not enabled yet. This option is scaffolded only.",
  [ERROR_CODES.PNGQUANT_LOAD_FAILED]:
    "Failed to load pngquant engine.",
  [ERROR_CODES.PNGQUANT_ENCODE_FAILED]:
    "Failed to encode PNG output with pngquant.",
  [ERROR_CODES.OXIPNG_LOAD_FAILED]:
    "Failed to load oxipng engine.",
  [ERROR_CODES.OXIPNG_ENCODE_FAILED]:
    "Failed to optimize PNG output with oxipng.",
  [ERROR_CODES.OUT_OF_MEMORY]:
    "Not enough memory. Try fewer/smaller files and retry.",
  [ERROR_CODES.USER_CANCELED]: "Conversion was canceled.",
});

export function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || "Unknown error occurred.";
}
