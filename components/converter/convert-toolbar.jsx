"use client";

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
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!isConversionEnabled || !hasPending || isRunning}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start
        </button>
        <button
          type="button"
          onClick={onCancelAll}
          disabled={!isRunning}
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel All
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={stats.total === 0 || isRunning}
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onDownloadZip}
          disabled={zipDisabled}
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isZipBuilding ? "ZIP 생성 중..." : "ZIP 다운로드"}
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        진행: {stats.done}/{stats.total} · pending {stats.pending} · processing{" "}
        {stats.processing} · success {stats.success}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        ZIP 대상: {zipStats.successItems.length}개 / {formatBytes(zipStats.totalBytes)}
      </p>

      {isCanceling ? (
        <p className="mt-1 text-xs text-amber-600">취소 중... 현재 작업은 체크포인트에서 중단됩니다.</p>
      ) : null}

      {zipStats.exceedsLimit ? (
        <p className="mt-1 text-xs text-destructive">
          ZIP 합계가 500MB를 초과하여 ZIP 다운로드를 비활성화했습니다.
        </p>
      ) : null}

      {!zipStats.exceedsLimit && zipStats.shouldWarn ? (
        <p className="mt-1 text-xs text-amber-600">
          ZIP 합계가 300MB를 초과했습니다. 다운로드 전 확인이 필요합니다.
        </p>
      ) : null}
    </section>
  );
}
