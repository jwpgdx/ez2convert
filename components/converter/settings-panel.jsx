"use client";

import {
  CONVERSION_LIMITS,
  AVIF_CHROMA_SUBSAMPLING,
  AVIF_TUNES,
  FRAME_DELAY_MODES,
  GIF_ALPHA_MODES,
  GIF_DITHER_MODES,
  JPG_CHROMA_SUBSAMPLING,
  RESIZE_MODES,
  SETTINGS_DEFAULTS,
  VIDEO_SCALE_MODES,
} from "@/lib/converters/constants";

const RESIZE_MODE_OPTIONS = [
  { value: RESIZE_MODES.ORIGINAL, label: "Keep original" },
  { value: RESIZE_MODES.PERCENT, label: "Percent" },
  { value: RESIZE_MODES.MAX, label: "Max box (downscale only)" },
  { value: RESIZE_MODES.EXACT, label: "Exact px" },
];

const EMPTY_VISIBILITY = Object.freeze({
  hasAnimatedInput: false,
  hasVideoInput: false,
});

function toNullableNumber(value) {
  if (!value && value !== 0) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
}

function toNullableInteger(value) {
  if (!value && value !== 0) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.floor(numeric);
}

export default function SettingsPanel({
  disabled,
  settings,
  visibility,
  showTimingOptions = true,
  showLosslessOption = true,
  showJpgOptions = false,
  showAvifOptions = false,
  showGifOptions = false,
  onChange,
  onReset,
}) {
  const nextSettings = settings || SETTINGS_DEFAULTS;
  const commonOptions = nextSettings.commonOptions || SETTINGS_DEFAULTS.commonOptions;
  const animatedOptions =
    nextSettings.animatedOptions || SETTINGS_DEFAULTS.animatedOptions;
  const videoOptions = nextSettings.videoOptions || SETTINGS_DEFAULTS.videoOptions;
  const jpgOptions = nextSettings.jpgOptions || SETTINGS_DEFAULTS.jpgOptions;
  const avifOptions = nextSettings.avifOptions || SETTINGS_DEFAULTS.avifOptions;
  const gifOptions = nextSettings.gifOptions || SETTINGS_DEFAULTS.gifOptions;
  const queueVisibility = visibility || EMPTY_VISIBILITY;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Conversion settings</h2>

      <div className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">
            Quality ({commonOptions.quality})
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={commonOptions.quality}
            disabled={disabled || (showLosslessOption && commonOptions.lossless)}
            onChange={(event) =>
              onChange?.("commonOptions", {
                quality: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </label>

        {showLosslessOption ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(commonOptions.lossless)}
              disabled={disabled}
              onChange={(event) => {
                const checked = event.target.checked;
                onChange?.("commonOptions", {
                  lossless: checked,
                  quality: checked ? 100 : commonOptions.quality,
                });
              }}
            />
            <span className="text-muted-foreground">
              Lossless output (quality is fixed to 100 while enabled)
            </span>
          </label>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">
            Effort ({commonOptions.effort}) 1 (Fastest) ~ 6 (Slowest)
          </span>
          <input
            type="range"
            min={1}
            max={6}
            value={commonOptions.effort}
            disabled={disabled}
            onChange={(event) =>
              onChange?.("commonOptions", {
                effort: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </label>

        {showTimingOptions ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Output FPS (common)
              </span>
              <input
                type="number"
                min={1}
                max={120}
                value={commonOptions.fps ?? ""}
                disabled={disabled}
                placeholder="ex. 20"
                onChange={(event) =>
                  onChange?.("commonOptions", {
                    fps: toNullableInteger(event.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Loop (common, 0 = infinite)
              </span>
              <input
                type="number"
                min={0}
                max={1000}
                value={commonOptions.loop ?? 0}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("commonOptions", {
                    loop: Math.max(0, toNullableInteger(event.target.value) ?? 0),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
          </div>
        ) : null}

        {queueVisibility.hasAnimatedInput ? (
          <div className="rounded-md border border-border/70 p-3 text-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Animated options (GIF/APNG only)
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <input
                  type="radio"
                  name="frameDelayMode"
                  value={FRAME_DELAY_MODES.ORIGINAL}
                  checked={
                    animatedOptions.frameDelayMode === FRAME_DELAY_MODES.ORIGINAL
                  }
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("animatedOptions", {
                      frameDelayMode: event.target.value,
                    })
                  }
                />
                <span>Keep original frame delay</span>
              </label>

              <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <input
                  type="radio"
                  name="frameDelayMode"
                  value={FRAME_DELAY_MODES.NORMALIZE}
                  checked={
                    animatedOptions.frameDelayMode === FRAME_DELAY_MODES.NORMALIZE
                  }
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("animatedOptions", {
                      frameDelayMode: event.target.value,
                    })
                  }
                />
                <span>Normalize frame delay</span>
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(animatedOptions.dropDuplicateFrames)}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("animatedOptions", {
                    dropDuplicateFrames: event.target.checked,
                  })
                }
              />
              <span className="text-muted-foreground">
                Drop duplicate frames
              </span>
            </label>
          </div>
        ) : null}

        {queueVisibility.hasVideoInput ? (
          <div className="rounded-md border border-border/70 p-3 text-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Video options
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Trim start (sec)
                </span>
                <input
                  type="number"
                  min={0}
                  value={videoOptions.trimStartSec ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("videoOptions", {
                      trimStartSec: toNullableNumber(event.target.value),
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Trim end (sec)
                </span>
                <input
                  type="number"
                  min={0}
                  value={videoOptions.trimEndSec ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("videoOptions", {
                      trimEndSec: toNullableNumber(event.target.value),
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-muted-foreground">
                Scale mode
              </span>
              <select
                value={videoOptions.scaleMode || VIDEO_SCALE_MODES.FIT}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("videoOptions", {
                    scaleMode: event.target.value,
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={VIDEO_SCALE_MODES.FIT}>Fit (letterbox)</option>
                <option value={VIDEO_SCALE_MODES.CROP}>Crop (fill)</option>
              </select>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Max duration (sec)
                </span>
                <input
                  type="number"
                  min={1}
                  value={videoOptions.maxDurationSec ?? ""}
                  disabled={disabled}
                  placeholder={`${CONVERSION_LIMITS.maxVideoDurationSec} (default)`}
                  onChange={(event) =>
                    onChange?.("videoOptions", {
                      maxDurationSec: toNullableNumber(event.target.value),
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Max frames
                </span>
                <input
                  type="number"
                  min={1}
                  value={videoOptions.maxFrames ?? ""}
                  disabled={disabled}
                  placeholder={`${CONVERSION_LIMITS.maxVideoFrames} (default)`}
                  onChange={(event) =>
                    onChange?.("videoOptions", {
                      maxFrames: toNullableInteger(event.target.value),
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Limits: max {CONVERSION_LIMITS.maxVideoDurationSec}s and estimated{" "}
              {CONVERSION_LIMITS.maxVideoFrames} frames. Use trim/FPS to stay under
              limits.
            </p>
          </div>
        ) : null}

        {showJpgOptions ? (
          <div className="rounded-md border border-border/70 p-3 text-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              JPG options
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(jpgOptions.progressive)}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("jpgOptions", {
                    progressive: event.target.checked,
                  })
                }
              />
              <span className="text-muted-foreground">Progressive JPEG</span>
            </label>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-muted-foreground">
                Chroma subsampling
              </span>
              <select
                value={
                  jpgOptions.chromaSubsampling ||
                  JPG_CHROMA_SUBSAMPLING.AUTO
                }
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("jpgOptions", {
                    chromaSubsampling: event.target.value,
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={JPG_CHROMA_SUBSAMPLING.AUTO}>Auto</option>
                <option value={JPG_CHROMA_SUBSAMPLING.CHROMA_420}>4:2:0 (smaller)</option>
                <option value={JPG_CHROMA_SUBSAMPLING.CHROMA_444}>4:4:4 (sharper)</option>
              </select>
            </label>

            <label className="mt-3 text-sm">
              <span className="mb-1 block text-muted-foreground">
                Background color for alpha input
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={jpgOptions.alphaBackground || "#FFFFFF"}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("jpgOptions", {
                      alphaBackground: event.target.value.toUpperCase(),
                    })
                  }
                  className="h-9 w-14 rounded border border-input bg-background p-1"
                />
                <input
                  type="text"
                  value={jpgOptions.alphaBackground || "#FFFFFF"}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("jpgOptions", {
                      alphaBackground: event.target.value,
                    })
                  }
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 uppercase"
                />
              </div>
            </label>

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(jpgOptions.stripMetadata)}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("jpgOptions", {
                    stripMetadata: event.target.checked,
                  })
                }
              />
              <span className="text-muted-foreground">
                Strip metadata (EXIF/ICC)
              </span>
            </label>
          </div>
        ) : null}

        {showAvifOptions ? (
          <div className="rounded-md border border-border/70 p-3 text-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              AVIF options
            </p>

            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Tune</span>
              <select
                value={avifOptions.tune || AVIF_TUNES.AUTO}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("avifOptions", {
                    tune: event.target.value,
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={AVIF_TUNES.AUTO}>Auto</option>
                <option value={AVIF_TUNES.SSIM}>SSIM (better quality)</option>
              </select>
            </label>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-muted-foreground">
                Chroma subsampling
              </span>
              <select
                value={avifOptions.chromaSubsampling || AVIF_CHROMA_SUBSAMPLING.AUTO}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("avifOptions", {
                    chromaSubsampling: event.target.value,
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={AVIF_CHROMA_SUBSAMPLING.AUTO}>Auto</option>
                <option value={AVIF_CHROMA_SUBSAMPLING.CHROMA_420}>4:2:0 (smaller)</option>
                <option value={AVIF_CHROMA_SUBSAMPLING.CHROMA_444}>4:4:4 (sharper)</option>
              </select>
            </label>
          </div>
        ) : null}

        {showGifOptions ? (
          <div className="rounded-md border border-border/70 p-3 text-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              GIF options
            </p>

            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">
                Alpha mode (GIF is 1-bit transparency)
              </span>
              <select
                value={gifOptions.alphaMode || GIF_ALPHA_MODES.PRESERVE}
                disabled={disabled}
                onChange={(event) =>
                  onChange?.("gifOptions", {
                    alphaMode: event.target.value,
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={GIF_ALPHA_MODES.PRESERVE}>
                  Preserve transparent pixels
                </option>
                <option value={GIF_ALPHA_MODES.FLATTEN}>
                  Flatten onto background
                </option>
              </select>
            </label>

            <label className="mt-3 text-sm">
              <span className="mb-1 block text-muted-foreground">
                Background color for alpha matte
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={jpgOptions.alphaBackground || "#FFFFFF"}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("jpgOptions", {
                      alphaBackground: event.target.value.toUpperCase(),
                    })
                  }
                  className="h-9 w-14 rounded border border-input bg-background p-1"
                />
                <input
                  type="text"
                  value={jpgOptions.alphaBackground || "#FFFFFF"}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("jpgOptions", {
                      alphaBackground: event.target.value,
                    })
                  }
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 uppercase"
                />
              </div>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Alpha threshold (0-255)
                </span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={gifOptions.alphaThreshold ?? 1}
                  disabled={
                    disabled || gifOptions.alphaMode !== GIF_ALPHA_MODES.PRESERVE
                  }
                  onChange={(event) =>
                    onChange?.("gifOptions", {
                      alphaThreshold: Math.max(
                        0,
                        Math.min(255, toNullableInteger(event.target.value) ?? 1)
                      ),
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Dither
                </span>
                <select
                  value={gifOptions.dither || GIF_DITHER_MODES.FLOYD}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("gifOptions", {
                      dither: event.target.value,
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value={GIF_DITHER_MODES.FLOYD}>Floyd</option>
                  <option value={GIF_DITHER_MODES.BAYER}>Bayer</option>
                  <option value={GIF_DITHER_MODES.NONE}>None</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 text-sm">
          <span className="block text-muted-foreground">Resize</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {RESIZE_MODE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <input
                  type="radio"
                  name="resizeMode"
                  value={option.value}
                  checked={commonOptions.resizeMode === option.value}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange?.("commonOptions", {
                      resizeMode: event.target.value,
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {commonOptions.resizeMode === RESIZE_MODES.PERCENT ? (
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Scale (%)</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={commonOptions.scalePercent ?? 100}
              disabled={disabled}
              onChange={(event) =>
                onChange?.("commonOptions", {
                  scalePercent: Number(event.target.value),
                })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
        ) : null}

        {commonOptions.resizeMode === RESIZE_MODES.MAX ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">maxWidth</span>
              <input
                type="number"
                min={1}
                value={commonOptions.maxWidth ?? ""}
                disabled={disabled}
                placeholder="optional"
                onChange={(event) =>
                  onChange?.("commonOptions", {
                    maxWidth: toNullableNumber(event.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">maxHeight</span>
              <input
                type="number"
                min={1}
                value={commonOptions.maxHeight ?? ""}
                disabled={disabled}
                placeholder="optional"
                onChange={(event) =>
                  onChange?.("commonOptions", {
                    maxHeight: toNullableNumber(event.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
          </div>
        ) : null}

        {commonOptions.resizeMode === RESIZE_MODES.EXACT ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">width(px)</span>
              <input
                type="number"
                min={1}
                value={commonOptions.exactWidth ?? ""}
                disabled={disabled}
                placeholder="optional"
                onChange={(event) =>
                  onChange?.("commonOptions", {
                    exactWidth: toNullableNumber(event.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">height(px)</span>
              <input
                type="number"
                min={1}
                value={commonOptions.exactHeight ?? ""}
                disabled={disabled}
                placeholder="optional"
                onChange={(event) =>
                  onChange?.("commonOptions", {
                    exactHeight: toNullableNumber(event.target.value),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          onClick={() => onReset?.()}
          className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset settings
        </button>
      </div>
    </section>
  );
}
