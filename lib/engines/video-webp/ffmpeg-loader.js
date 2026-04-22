import { getAnimatedFfmpeg, resetAnimatedFfmpeg } from "../animated-webp/ffmpeg-loader";

export function getVideoFfmpeg(signal) {
  return getAnimatedFfmpeg(signal);
}

export function resetVideoFfmpeg() {
  resetAnimatedFfmpeg();
}
