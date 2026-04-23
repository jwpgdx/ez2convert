"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConverterHeader from "./converter-header";
import ConvertToolbar from "./convert-toolbar";
import FileList from "./file-list";
import PreviewCompare from "./preview-compare";
import SettingsPanel from "./settings-panel";
import ToastStack from "./toast-stack";
import UploadDropzone from "./upload-dropzone";
import { useConversionQueue } from "@/hooks/use-conversion-queue";
import {
  SETTINGS_DEFAULTS,
  flattenSettingsToConversionOptions,
} from "@/lib/converters/constants";
import {
  getErrorMessage,
} from "@/lib/converters/error-messages";
import { checkWebpEncodeSupport } from "@/lib/converters/webp-encode-support";
import {
  createZipBlobFromItems,
  createZipFileName,
  getZipStats,
} from "@/lib/download/zip-download";
import { saveBlob } from "@/lib/download/save-blob";
import { APP_ROUTES } from "@/lib/config/routes";
import { ERROR_CODES } from "@/lib/constants/error-codes";

const SUPPORT_STATUS = {
  IDLE: "idle",
  READY: "ready",
  UNSUPPORTED: "unsupported",
};

let toastIdSeed = 0;

export default function ConverterShell() {
  const [supportStatus, setSupportStatus] = useState(SUPPORT_STATUS.IDLE);
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  const [selectedId, setSelectedId] = useState(null);
  const [isZipBuilding, setIsZipBuilding] = useState(false);
  const [toasts, setToasts] = useState([]);

  const isConversionEnabled = supportStatus === SUPPORT_STATUS.READY;
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

  const queue = useConversionQueue({
    settings: conversionOptions,
    conversionEnabled: isConversionEnabled,
    onNotify: addToast,
  });

  const zipStats = useMemo(() => getZipStats(queue.items), [queue.items]);
  const selectedItem = useMemo(
    () => queue.items.find((item) => item.id === selectedId) || null,
    [queue.items, selectedId]
  );

  useEffect(() => {
    let isMounted = true;

    async function runSupportCheck() {
      const supported = await checkWebpEncodeSupport();
      if (!isMounted) {
        return;
      }
      setSupportStatus(
        supported ? SUPPORT_STATUS.READY : SUPPORT_STATUS.UNSUPPORTED
      );
    }

    runSupportCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (supportStatus === SUPPORT_STATUS.UNSUPPORTED) {
      addToast({
        code: ERROR_CODES.WEBP_ENCODE_UNSUPPORTED,
        message: getErrorMessage(ERROR_CODES.WEBP_ENCODE_UNSUPPORTED),
      });
    }
  }, [addToast, supportStatus]);

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
      saveBlob(zipBlob, createZipFileName());
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
          activeRoute={APP_ROUTES.TO_WEBP}
          description="Convert images, animations, and short videos to WebP locally in your browser."
          badges={["JPG, PNG, GIF, APNG, video", "Animated WebP", "Local only"]}
        />

        {supportStatus === SUPPORT_STATUS.IDLE ? (
          <div className="mt-5 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Checking browser WebP encoding support...
          </div>
        ) : null}

        {supportStatus === SUPPORT_STATUS.UNSUPPORTED ? (
          <div className="mt-5 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {getErrorMessage(ERROR_CODES.WEBP_ENCODE_UNSUPPORTED)}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <UploadDropzone
            disabled={!isConversionEnabled || queue.isRunning}
            onAddFiles={queue.addFiles}
          />
          <SettingsPanel
            disabled={queue.isRunning}
            settings={settings}
            visibility={queue.capabilities}
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
            isConversionEnabled={isConversionEnabled}
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
