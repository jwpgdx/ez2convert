"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConvertToolbar from "./convert-toolbar";
import FileList from "./file-list";
import PreviewCompare from "./preview-compare";
import SettingsPanel from "./settings-panel";
import ToastStack from "./toast-stack";
import UploadDropzone from "./upload-dropzone";
import { usePngConversionQueue } from "@/hooks/use-png-conversion-queue";
import {
  SETTINGS_DEFAULTS,
  flattenSettingsToConversionOptions,
} from "@/lib/converters/constants";
import { getErrorMessage } from "@/lib/converters/error-messages";
import { checkPngEncodeSupport } from "@/lib/converters/png-encode-support";
import {
  createZipBlobFromItems,
  createZipFileName,
  getZipStats,
} from "@/lib/download/zip-download";
import { saveBlob } from "@/lib/download/save-blob";
import {
  IMAGE_UPLOAD_ACCEPT,
  SUPPORTED_STATIC_INPUT_DESCRIPTION,
} from "@/lib/config/file-types";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";
import { ERROR_CODES } from "@/lib/constants/error-codes";

const SUPPORT_STATUS = {
  IDLE: "idle",
  READY: "ready",
  UNSUPPORTED: "unsupported",
};

const ZIP_NAME_PREFIX = "png-converted";

let toastIdSeed = 0;

export default function PngConverterShell() {
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

  const queue = usePngConversionQueue({
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
      const supported = await checkPngEncodeSupport();
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
        code: ERROR_CODES.PNG_ENCODE_UNSUPPORTED,
        message: getErrorMessage(ERROR_CODES.PNG_ENCODE_UNSUPPORTED),
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
      saveBlob(zipBlob, createZipFileName(ZIP_NAME_PREFIX));
    } catch {
      addToast({ message: "Failed to build ZIP file." });
    } finally {
      setIsZipBuilding(false);
    }
  };

  return (
    <>
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {ROUTE_TITLES[APP_ROUTES.TO_PNG]}
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Convert static images to optimized PNG locally in your browser.
          </p>
        </div>

        {supportStatus === SUPPORT_STATUS.IDLE ? (
          <div className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Checking browser PNG encoding support...
          </div>
        ) : null}

        {supportStatus === SUPPORT_STATUS.UNSUPPORTED ? (
          <div className="mt-5 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {getErrorMessage(ERROR_CODES.PNG_ENCODE_UNSUPPORTED)}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <UploadDropzone
            accept={IMAGE_UPLOAD_ACCEPT}
            supportedDescription={SUPPORTED_STATIC_INPUT_DESCRIPTION}
            disabled={!isConversionEnabled || queue.isRunning}
            onAddFiles={queue.addFiles}
          />
          <SettingsPanel
            disabled={queue.isRunning}
            settings={settings}
            visibility={queue.capabilities}
            showTimingOptions={false}
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
