"use client";

import { useMemo, useState } from "react";
import {
  CONVERSION_DEFAULTS,
  FRAME_DELAY_MODES,
  RESIZE_MODES,
  VIDEO_SCALE_MODES,
} from "@/lib/converters/constants";
import {
  ENGINE_KINDS,
  resolveEngineKindFromTypeResult,
  resolveEngineLabel,
} from "@/lib/config/engine-dispatch";
import { MIME_TYPES } from "@/lib/config/file-types";
import { convertAnimatedToWebp } from "@/lib/converters/animated-to-webp";
import { detectFileType } from "@/lib/converters/detect-file-type";
import { convertAnimatedToGif } from "@/lib/converters/animated-to-gif";
import { convertImageToJpg } from "@/lib/converters/image-to-jpg";
import { convertImageToAvif } from "@/lib/converters/image-to-avif";
import { convertImageToGif } from "@/lib/converters/image-to-gif";
import { convertImageToPng } from "@/lib/converters/image-to-png";
import { convertImageToWebp } from "@/lib/converters/image-to-webp";
import { convertVideoToGif } from "@/lib/converters/video-to-gif";
import { convertVideoToWebp } from "@/lib/converters/video-to-webp";
import { formatBytes } from "@/lib/format/format-bytes";

const GIF_BASE64 = "R0lGODdhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yf6kAAAAASUVORK5CYII=";
const TARGETS = Object.freeze({
  WEBP: "to-webp",
  PNG: "to-png",
  JPG: "to-jpg",
  AVIF: "to-avif",
  GIF: "to-gif",
});

function toFileFromBase64(base64, name, type) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type });
}

function readUint32BE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    false
  );
}

function writeUint32BE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(
    offset,
    value,
    false
  );
}

let crcTable = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let c = index;
    for (let bit = 0; bit < 8; bit += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[index] = c >>> 0;
  }

  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[index]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data = new Uint8Array()) {
  const typeBytes = new TextEncoder().encode(type);
  const size = new Uint8Array(4);
  writeUint32BE(size, 0, data.length);

  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);

  const crc = new Uint8Array(4);
  writeUint32BE(crc, 0, crc32(crcInput));

  const merged = new Uint8Array(size.length + typeBytes.length + data.length + crc.length);
  merged.set(size, 0);
  merged.set(typeBytes, 4);
  merged.set(data, 8);
  merged.set(crc, 8 + data.length);

  return merged;
}

function parsePngChunks(bytes) {
  const decoder = new TextDecoder();
  const chunks = [];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd + 4 > bytes.length) {
      break;
    }

    chunks.push({
      type,
      data: bytes.slice(dataStart, dataEnd),
    });

    offset = dataEnd + 4;
    if (type === "IEND") {
      break;
    }
  }

  return chunks;
}

function mergeByteArrays(parts) {
  const totalSize = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;

  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
}

function buildValidApngFixture(name = "fixture-valid.apng.png") {
  const sourceBytes = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));
  const signature = sourceBytes.slice(0, 8);
  const chunks = parsePngChunks(sourceBytes);

  const ihdrChunk = chunks.find((chunk) => chunk.type === "IHDR");
  const idatChunks = chunks.filter((chunk) => chunk.type === "IDAT");

  if (!ihdrChunk || idatChunks.length === 0) {
    throw new Error("valid APNG fixture generation failed (base PNG parse)");
  }

  const width = readUint32BE(ihdrChunk.data, 0);
  const height = readUint32BE(ihdrChunk.data, 4);

  const actl = new Uint8Array(8);
  writeUint32BE(actl, 0, 1);
  writeUint32BE(actl, 4, 0);

  const fctl = new Uint8Array(26);
  const fctlView = new DataView(fctl.buffer);
  fctlView.setUint32(0, 0, false); // sequence_number
  fctlView.setUint32(4, width, false);
  fctlView.setUint32(8, height, false);
  fctlView.setUint32(12, 0, false); // x_offset
  fctlView.setUint32(16, 0, false); // y_offset
  fctlView.setUint16(20, 1, false); // delay_num
  fctlView.setUint16(22, 10, false); // delay_den
  fctl[24] = 0; // dispose_op
  fctl[25] = 0; // blend_op

  const parts = [
    signature,
    createPngChunk("IHDR", ihdrChunk.data),
    createPngChunk("acTL", actl),
    createPngChunk("fcTL", fctl),
    ...idatChunks.map((chunk) => createPngChunk("IDAT", chunk.data)),
    createPngChunk("IEND", new Uint8Array()),
  ];

  return new File([mergeByteArrays(parts)], name, { type: "image/png" });
}

function buildApngFixture(name = "fixture-invalid.apng.png") {
  const signature = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  function createChunk(type, data = new Uint8Array()) {
    const size = new Uint8Array(4);
    new DataView(size.buffer).setUint32(0, data.length, false);
    const typeBytes = new TextEncoder().encode(type);
    const crc = new Uint8Array(4);

    const merged = new Uint8Array(size.length + typeBytes.length + data.length + crc.length);
    merged.set(size, 0);
    merged.set(typeBytes, 4);
    merged.set(data, 8);
    merged.set(crc, 8 + data.length);
    return merged;
  }

  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, 1, false);
  new DataView(ihdr.buffer).setUint32(4, 1, false);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const actl = new Uint8Array(8);
  new DataView(actl.buffer).setUint32(0, 1, false);
  new DataView(actl.buffer).setUint32(4, 0, false);

  const parts = [
    signature,
    createChunk("IHDR", ihdr),
    createChunk("acTL", actl),
    createChunk("IEND"),
  ];

  const totalSize = parts.reduce((sum, p) => sum + p.length, 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return new File([merged], name, { type: "image/png" });
}

async function createRasterFixture({ name, mimeType, width = 256, height = 160 }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas context unavailable");
  }

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1f3a8a");
  gradient.addColorStop(1, "#22c55e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255,255,255,0.7)";
  context.fillRect(16, 16, width - 32, height - 32);

  context.fillStyle = "#111827";
  context.font = "bold 18px sans-serif";
  context.fillText("QA FIXTURE", 24, 48);
  context.font = "14px sans-serif";
  context.fillText(`${mimeType} ${width}x${height}`, 24, 74);

  const quality = mimeType === "image/jpeg" ? 0.92 : undefined;
  const blob = await new Promise((resolve) =>
    canvas.toBlob((value) => resolve(value), mimeType, quality)
  );

  if (!blob) {
    throw new Error("fixture toBlob failed");
  }

  return new File([blob], name, { type: mimeType });
}

async function createTransparentPngFixture({
  name = "fixture-transparent.png",
  width = 256,
  height = 160,
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas context unavailable");
  }

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(255, 0, 0, 0.4)";
  context.fillRect(20, 20, width - 40, height - 40);
  context.fillStyle = "rgba(0, 0, 255, 0.8)";
  context.beginPath();
  context.arc(width / 2, height / 2, 35, 0, Math.PI * 2);
  context.fill();

  const blob = await new Promise((resolve) =>
    canvas.toBlob((value) => resolve(value), MIME_TYPES.PNG)
  );

  if (!blob) {
    throw new Error("transparent fixture toBlob failed");
  }

  return new File([blob], name, { type: MIME_TYPES.PNG });
}

async function createRecordedVideoFixture({ name = "fixture-video.webm" } = {}) {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  const mimeCandidates = ["video/webm;codecs=vp8", "video/webm"];
  const mimeType =
    mimeCandidates.find((value) =>
      typeof MediaRecorder.isTypeSupported === "function"
        ? MediaRecorder.isTypeSupported(value)
        : value === "video/webm"
    ) || "video/webm";

  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  let frame = 0;
  const drawFrame = () => {
    const hue = (frame * 19) % 360;
    context.fillStyle = `hsl(${hue} 72% 52%)`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255,255,255,0.88)";
    context.fillRect((frame * 4) % 72, 18, 24, 24);
    frame += 1;
  };

  drawFrame();
  const timer = window.setInterval(drawFrame, 70);

  const stream = canvas.captureStream(12);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data?.size) {
      chunks.push(event.data);
    }
  };

  recorder.start(100);
  await new Promise((resolve) => window.setTimeout(resolve, 900));

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("media recorder failed"));
  });

  recorder.stop();
  await stopped;

  window.clearInterval(timer);
  stream.getTracks().forEach((track) => track.stop());

  const blob = new Blob(chunks, { type: mimeType });
  if (!blob.size) {
    return null;
  }

  return new File([blob], name, { type: mimeType });
}

function createInvalidVideoFixture(name = "fixture-invalid.mp4") {
  return new File([new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44])], name, {
    type: "video/mp4",
  });
}

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)} ms`;
}

function getReductionText(inputBytes, outputBytes) {
  if (!inputBytes || !outputBytes) {
    return "-";
  }

  const reduction = ((1 - outputBytes / inputBytes) * 100).toFixed(1);
  return `${reduction}%`;
}

function buildCases(fixtures) {
  const entries = [
    {
      id: "jpg-default",
      label: "JPG default",
      file: fixtures.jpg,
      target: TARGETS.WEBP,
      options: {},
      expected: "success",
    },
    {
      id: "png-lossless",
      label: "PNG lossless",
      file: fixtures.png,
      target: TARGETS.WEBP,
      options: { lossless: true },
      expected: "success",
    },
    {
      id: "to-png-jpg-quality80",
      label: "To-PNG JPG quality=80",
      file: fixtures.jpg,
      target: TARGETS.PNG,
      options: {
        quality: 80,
        lossless: false,
        effort: 4,
      },
      expected: "success",
    },
    {
      id: "to-png-png-lossless",
      label: "To-PNG PNG lossless",
      file: fixtures.png,
      target: TARGETS.PNG,
      options: {
        quality: 55,
        lossless: true,
        effort: 4,
      },
      expected: "success",
    },
    {
      id: "to-png-jpg-quality100",
      label: "To-PNG JPG quality=100",
      file: fixtures.jpg,
      target: TARGETS.PNG,
      options: {
        quality: 100,
        lossless: false,
        effort: 3,
      },
      expected: "success",
    },
    {
      id: "to-png-resize-percent",
      label: "To-PNG resize percent + quality",
      file: fixtures.jpg,
      target: TARGETS.PNG,
      options: {
        quality: 72,
        lossless: false,
        effort: 5,
        resizeMode: RESIZE_MODES.PERCENT,
        scalePercent: 65,
      },
      expected: "success",
    },
    {
      id: "to-jpg-from-jpg",
      label: "To-JPG JPG default",
      file: fixtures.jpg,
      target: TARGETS.JPG,
      options: {
        quality: 82,
      },
      expected: "success",
    },
    {
      id: "to-jpg-alpha-bg",
      label: "To-JPG PNG alpha flatten",
      file: fixtures.pngAlpha,
      target: TARGETS.JPG,
      options: {
        quality: 78,
        progressive: true,
        chromaSubsampling: "4:2:0",
        alphaBackground: "#FFFFFF",
      },
      expected: "success",
    },
    {
      id: "to-avif-from-jpg",
      label: "To-AVIF JPG default",
      file: fixtures.jpg,
      target: TARGETS.AVIF,
      options: {
        quality: 50,
        lossless: false,
        effort: 4,
      },
      expected: "success",
    },
    {
      id: "to-avif-alpha",
      label: "To-AVIF PNG alpha preserved",
      file: fixtures.pngAlpha,
      target: TARGETS.AVIF,
      options: {
        quality: 50,
        lossless: false,
        effort: 4,
        avifOptions: {
          tune: "auto",
          chromaSubsampling: "auto",
        },
      },
      expected: "success",
    },
    {
      id: "to-avif-lossless",
      label: "To-AVIF lossless",
      file: fixtures.pngAlpha,
      target: TARGETS.AVIF,
      options: {
        quality: 50,
        lossless: true,
        effort: 4,
      },
      expected: "success",
    },
    {
      id: "to-gif-from-jpg",
      label: "To-GIF JPG default",
      file: fixtures.jpg,
      target: TARGETS.GIF,
      options: {
        quality: 82,
        effort: 4,
        gifOptions: {
          alphaMode: "preserve",
          alphaThreshold: 1,
          dither: "floyd",
        },
      },
      expected: "success",
    },
    {
      id: "to-gif-alpha",
      label: "To-GIF PNG alpha (preserve)",
      file: fixtures.pngAlpha,
      target: TARGETS.GIF,
      options: {
        quality: 86,
        effort: 4,
        alphaBackground: "#FFFFFF",
        gifOptions: {
          alphaMode: "preserve",
          alphaThreshold: 1,
          dither: "floyd",
        },
      },
      expected: "success",
    },
    {
      id: "gif-default",
      label: "GIF default (animated)",
      file: fixtures.gif,
      target: TARGETS.WEBP,
      options: {},
      expected: "success",
    },
    {
      id: "gif-fps-loop",
      label: "GIF normalize fps+loop",
      file: fixtures.gif,
      target: TARGETS.WEBP,
      options: {
        fps: 12,
        loop: 3,
        frameDelayMode: FRAME_DELAY_MODES.NORMALIZE,
      },
      expected: "success",
    },
    {
      id: "gif-drop-dup",
      label: "GIF drop duplicate frames",
      file: fixtures.gif,
      target: TARGETS.WEBP,
      options: {
        dropDuplicateFrames: true,
      },
      expected: "success",
    },
    {
      id: "apng-valid",
      label: "APNG valid success",
      file: fixtures.apngValid,
      target: TARGETS.WEBP,
      options: {},
      expected: "success",
    },
    {
      id: "apng-regression",
      label: "APNG regression (expected fail fixture)",
      file: fixtures.apngInvalid,
      target: TARGETS.WEBP,
      options: {},
      expected: "error",
    },
    {
      id: "video-invalid-regression",
      label: "Video invalid regression (expected fail fixture)",
      file: fixtures.videoInvalid,
      target: TARGETS.WEBP,
      options: {},
      expected: "error",
    },
    {
      id: "video-to-gif-invalid-regression",
      label: "Video -> GIF invalid regression (expected fail fixture)",
      file: fixtures.videoInvalid,
      target: TARGETS.GIF,
      options: {},
      expected: "error",
    },
  ];

  if (fixtures.videoWebm) {
    entries.push({
      id: "video-webm-success",
      label: "Video WEBM success",
      file: fixtures.videoWebm,
      target: TARGETS.WEBP,
      options: {
        fps: 10,
        loop: 0,
        trimStartSec: 0,
        trimEndSec: 0.6,
        scaleMode: VIDEO_SCALE_MODES.FIT,
      },
      expected: "success",
    });

    entries.push({
      id: "video-to-gif-webm-success",
      label: "Video -> GIF WEBM success",
      file: fixtures.videoWebm,
      target: TARGETS.GIF,
      options: {
        fps: 10,
        loop: 0,
        trimStartSec: 0,
        trimEndSec: 0.6,
        scaleMode: VIDEO_SCALE_MODES.FIT,
        gifOptions: {
          dither: "floyd",
        },
      },
      expected: "success",
    });
  }

  return entries;
}

async function runSingleCase(entry) {
  const startedAt = performance.now();
  const target = entry.target || TARGETS.WEBP;

  try {
    const fileType = await detectFileType(entry.file);
    if (!fileType.ok) {
      return {
        id: entry.id,
        label: entry.label,
        target,
        ok: entry.expected === "error",
        expected: entry.expected,
        actual: "error",
        durationMs: performance.now() - startedAt,
        engine: "detector",
        inputSize: entry.file.size,
        outputSize: 0,
        reduction: "-",
        errorCode: fileType.errorCode,
      };
    }

    const engineKind = resolveEngineKindFromTypeResult(fileType);
    const engine = resolveEngineLabel(engineKind);
    const converter =
      target === TARGETS.PNG
        ? convertImageToPng
        : target === TARGETS.JPG
          ? convertImageToJpg
          : target === TARGETS.AVIF
          ? convertImageToAvif
          : target === TARGETS.GIF
          ? engineKind === ENGINE_KINDS.VIDEO
            ? convertVideoToGif
            : engineKind === ENGINE_KINDS.ANIMATED_IMAGE
              ? convertAnimatedToGif
              : convertImageToGif
          : engineKind === ENGINE_KINDS.VIDEO
          ? convertVideoToWebp
          : engineKind === ENGINE_KINDS.ANIMATED_IMAGE
            ? convertAnimatedToWebp
            : convertImageToWebp;

    const result = await converter(
      entry.file,
      {
        ...CONVERSION_DEFAULTS,
        ...entry.options,
      },
      {
        detectedType: fileType.type,
      }
    );

    const durationMs = performance.now() - startedAt;

    if (!result.ok) {
      return {
        id: entry.id,
        label: entry.label,
        target,
        ok: entry.expected === "error",
        expected: entry.expected,
        actual: "error",
        durationMs,
        engine: `${engine} (${target})`,
        inputSize: entry.file.size,
        outputSize: 0,
        reduction: "-",
        errorCode: result.errorCode,
      };
    }

    if (result.output?.url) {
      URL.revokeObjectURL(result.output.url);
    }

    return {
      id: entry.id,
      label: entry.label,
      target,
      ok: entry.expected === "success",
      expected: entry.expected,
      actual: "success",
      durationMs,
      engine: `${engine} (${target})`,
      inputSize: entry.file.size,
      outputSize: result.output.size,
      reduction: getReductionText(entry.file.size, result.output.size),
      errorCode: null,
    };
  } catch (error) {
    return {
      id: entry.id,
      label: entry.label,
      target,
      ok: entry.expected === "error",
      expected: entry.expected,
      actual: "error",
      durationMs: performance.now() - startedAt,
      engine: "runtime",
      inputSize: entry.file.size,
      outputSize: 0,
      reduction: "-",
      errorCode: error?.code || error?.message || "UNKNOWN_ERROR",
    };
  }
}

function downloadJson(name, value) {
  const text = JSON.stringify(value, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function QARunnerClient() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [fatalError, setFatalError] = useState("");

  const summary = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.ok).length;
    const failed = total - passed;
    return { total, passed, failed };
  }, [results]);

  const handleRunAll = async () => {
    setIsRunning(true);
    setResults([]);
    setFatalError("");

    try {
      const fixtures = {
        jpg: await createRasterFixture({
          name: "fixture.jpg",
          mimeType: MIME_TYPES.JPEG,
        }),
        png: await createRasterFixture({
          name: "fixture.png",
          mimeType: MIME_TYPES.PNG,
        }),
        pngAlpha: await createTransparentPngFixture(),
        gif: toFileFromBase64(GIF_BASE64, "fixture.gif", MIME_TYPES.GIF),
        apngValid: buildValidApngFixture(),
        apngInvalid: buildApngFixture(),
        videoInvalid: createInvalidVideoFixture(),
        videoWebm: await createRecordedVideoFixture(),
      };

      const cases = buildCases(fixtures);

      for (const entry of cases) {
        const single = await runSingleCase(entry);
        setResults((previous) => [...previous, single]);
      }
    } catch (error) {
      setFatalError(error?.message || "Unknown fatal error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) {
      return;
    }

    downloadJson(
      `qa-runner_${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      {
        createdAt: new Date().toISOString(),
        summary,
        results,
      }
    );
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 md:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Converter QA Runner</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Run built-in conversion scenarios for to-webp, to-png, to-jpg, to-avif and to-gif with one click and inspect logs.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunning}
            className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run All Cases"}
          </button>
          <button
            type="button"
            onClick={() => {
              setResults([]);
              setFatalError("");
            }}
            disabled={isRunning}
            className="rounded-md border border-border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isRunning || results.length === 0}
            className="rounded-md border border-border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export JSON
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Options included in automated cases: `quality`, `lossless`, `effort`, `resizeMode`,
          `fps`, `loop`, `frameDelayMode`, `dropDuplicateFrames`, `trimStartSec`, `trimEndSec`,
          `scaleMode`, `progressive`, `chromaSubsampling`, `alphaBackground`, `stripMetadata`,
          `avifOptions`, `gifOptions`.
        </p>
      </div>

      {fatalError ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Fatal error: {fatalError}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          total {summary.total} / passed {summary.passed} / failed {summary.failed}
        </p>
      </div>

      {results.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Results</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Case</th>
                  <th className="px-2 py-2 font-medium">Target</th>
                  <th className="px-2 py-2 font-medium">Engine</th>
                  <th className="px-2 py-2 font-medium">Duration</th>
                  <th className="px-2 py-2 font-medium">Input</th>
                  <th className="px-2 py-2 font-medium">Output</th>
                  <th className="px-2 py-2 font-medium">Reduction</th>
                  <th className="px-2 py-2 font-medium">Expected</th>
                  <th className="px-2 py-2 font-medium">Actual</th>
                  <th className="px-2 py-2 font-medium">Error</th>
                  <th className="px-2 py-2 font-medium">Pass</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-2">{row.label}</td>
                    <td className="px-2 py-2">{row.target}</td>
                    <td className="px-2 py-2">{row.engine}</td>
                    <td className="px-2 py-2">{formatMs(row.durationMs)}</td>
                    <td className="px-2 py-2">{formatBytes(row.inputSize)}</td>
                    <td className="px-2 py-2">
                      {row.outputSize ? formatBytes(row.outputSize) : "-"}
                    </td>
                    <td className="px-2 py-2">{row.reduction}</td>
                    <td className="px-2 py-2">{row.expected}</td>
                    <td className="px-2 py-2">{row.actual}</td>
                    <td className="px-2 py-2">{row.errorCode || "-"}</td>
                    <td className="px-2 py-2">
                      {row.ok ? (
                        <span className="text-emerald-600">PASS</span>
                      ) : (
                        <span className="text-destructive">FAIL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
