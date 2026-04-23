"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConverterHeader from "./converter-header";
import ConvertToolbar from "./convert-toolbar";
import FileList from "./file-list";
import PreviewCompare from "./preview-compare";
import SettingsPanel from "./settings-panel";
import ToastStack from "./toast-stack";
import UploadDropzone from "./upload-dropzone";
import { useGifConversionQueue } from "@/hooks/use-gif-conversion-queue";
import {
  SETTINGS_DEFAULTS,
  flattenSettingsToConversionOptions,
} from "@/lib/converters/constants";
import { getErrorMessage } from "@/lib/converters/error-messages";
import {
  createZipBlobFromItems,
  createZipFileName,
  getZipStats,
} from "@/lib/download/zip-download";
import { saveBlob } from "@/lib/download/save-blob";
import { APP_ROUTES } from "@/lib/config/routes";
import { ERROR_CODES } from "@/lib/constants/error-codes";

const ZIP_NAME_PREFIX = "gif-converted";

let toastIdSeed = 0;

export default function GifConverterShell() {
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  const [selectedId, setSelectedId] = useState(null);
  const [isZipBuilding, setIsZipBuilding] = useState(false);
  const [toasts, setToasts] = useState([]);

  const conversionOptions = useMemo(
    () => flattenSettingsToConversionOptions(settings),
    [settings]
  );

  const addToast = useCallback((payload) => {
    const id = ++toastIdSeed;
    const message =
      payload?.message ||
      getErrorMessage(payload?.code || ERROR_CODES.DECODE_FAILED);

    setToasts((previous) => [...previous, { id, message }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const queue = useGifConversionQueue({
    settings: conversionOptions,
    onNotify: addToast,
  });

  const zipStats = useMemo(() => getZipStats(queue.items), [queue.items]);
  const selectedItem = useMemo(
    () => queue.items.find((item) => item.id === selectedId) || null,
    [queue.items, selectedId]
  );

  useEffect(() => {
    if (queue.items.length === 0) {
      setSelectedId(null);
      return;
    }
    const exists = queue.items.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(queue.items[0].id);
    }
  }, [queue.items, selectedId]);

  const handleDownloadOne = (item) => {
    if (item.status !== "success" || !item.output?.blob || !item.output?.name) {
      return;
    }
    saveBlob(item.output.blob, item.output.name);
  };

  const handleDownloadZip = async () => {
    if (zipStats.exceedsLimit) {
      addToast({
        message: "ZIP bundle exceeds 500MB and download is disabled.",
      });
      return;
    }
    if (zipStats.successItems.length === 0) {
      return;
    }
    if (zipStats.shouldWarn) {
      const confirmed = window.confirm(
        "ZIP bundle exceeds 300MB. Continue to build ZIP?"
      );
      if (!confirmed) {
        return;
      }
    }

    setIsZipBuilding(true);
    try {
      const zipBlob = await createZipBlobFromItems(queue.items);
      saveBlob(zipBlob, createZipFileName(ZIP_NAME_PREFIX));
    } catch {
      addToast({ message: "Failed to build ZIP file." });
    } finally {
      setIsZipBuilding(false);
    }
  };

  return (
    <>
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 md:px-8 md:py-10">
        <ConverterHeader
          activeRoute={APP_ROUTES.TO_GIF}
          description="Convert images and short videos to GIF locally, with frame timing, alpha, and resize controls."
          badges={["Images and video", "Animated GIF", "Local only"]}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <UploadDropzone
            disabled={queue.isRunning}
            onAddFiles={queue.addFiles}
          />
          <SettingsPanel
            disabled={queue.isRunning}
            settings={settings}
            visibility={queue.capabilities}
            showLosslessOption={false}
            showGifOptions
            onChange={(section, partial) =>
              setSettings((previous) => ({
                ...previous,
                [section]: {
                  ...(previous?.[section] || {}),
                  ...partial,
                },
              }))
            }
            onReset={() => setSettings(SETTINGS_DEFAULTS)}
          />
        </div>

        <div className="mt-4">
          <ConvertToolbar
            stats={queue.stats}
            zipStats={zipStats}
            isRunning={queue.isRunning}
            isCanceling={queue.isCanceling}
            isZipBuilding={isZipBuilding}
            isConversionEnabled
            onStart={queue.start}
            onCancelAll={queue.cancelAll}
            onReset={queue.reset}
            onDownloadZip={handleDownloadZip}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <FileList
            items={queue.items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDownload={handleDownloadOne}
            onRetry={queue.retry}
            onRemove={queue.remove}
          />
          <PreviewCompare item={selectedItem} />
        </div>
      </section>

      <ToastStack
        toasts={toasts}
        onClose={(id) =>
          setToasts((previous) => previous.filter((toast) => toast.id !== id))
        }
      />
    </>
  );
}
