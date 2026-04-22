import { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance = null;
let ffmpegPromise = null;

async function createAndLoad(signal) {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({}, { signal });
  return ffmpeg;
}

export async function getAnimatedFfmpeg(signal) {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  if (!ffmpegPromise) {
    ffmpegPromise = createAndLoad(signal)
      .then((loaded) => {
        ffmpegInstance = loaded;
        return loaded;
      })
      .catch((error) => {
        ffmpegPromise = null;
        ffmpegInstance = null;
        throw error;
      });
  }

  return ffmpegPromise;
}

export function resetAnimatedFfmpeg() {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
  }

  ffmpegInstance = null;
  ffmpegPromise = null;
}
