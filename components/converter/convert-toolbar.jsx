"use client";

import { Archive, Play, RotateCcw, Square } from "lucide-react";
import { formatBytes } from "@/lib/format/format-bytes";

export default function ConvertToolbar({
  stats,
  zipStats,
  isRunning,
  isCanceling,
  isZipBuilding,
  isConversionEnabled,
  onStart,
  onCancelAll,
  onReset,
  onDownloadZip,
}) {
  const hasPending = stats.pending > 0;
  const hasSuccess = zipStats.successItems.length > 0;
  const zipDisabled = !hasSuccess || zipStats.exceedsLimit || isZipBuilding;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={!isConversionEnabled || !hasPending || isRunning}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Start
          </button>
          <button
            type="button"
            onClick={onCancelAll}
            disabled={!isRunning}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            Cancel All
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={stats.total === 0 || isRunning}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
          <button
            type="button"
            onClick={onDownloadZip}
            disabled={zipDisabled}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            {isZipBuilding ? "Building ZIP..." : "ZIP Download"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-border bg-background px-2.5 py-1">
            Done {stats.done}/{stats.total}
          </span>
          <span className="rounded-md border border-border bg-background px-2.5 py-1">
            Pending {stats.pending}
          </span>
          <span className="rounded-md border border-border bg-background px-2.5 py-1">
            Processing {stats.processing}
          </span>
          <span className="rounded-md border border-border bg-background px-2.5 py-1">
            Success {stats.success}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        ZIP ready: {zipStats.successItems.length} files /{" "}
        {formatBytes(zipStats.totalBytes)}
      </p>

      {isCanceling ? (
        <p className="mt-1 text-xs text-amber-600">
          Canceling... the active task will stop at the next checkpoint.
        </p>
      ) : null}

      {zipStats.exceedsLimit ? (
        <p className="mt-1 text-xs text-destructive">
          ZIP bundle exceeds 500MB, so ZIP download is disabled.
        </p>
      ) : null}

      {!zipStats.exceedsLimit && zipStats.shouldWarn ? (
        <p className="mt-1 text-xs text-amber-600">
          ZIP bundle exceeds 300MB. Confirmation is required before download.
        </p>
      ) : null}
    </section>
  );
}
