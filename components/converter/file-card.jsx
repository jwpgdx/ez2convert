"use client";

import { formatBytes } from "@/lib/format/format-bytes";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  pending: "대기",
  processing: "변환 중",
  success: "완료",
  error: "실패",
  canceled: "취소",
};

const STATUS_COLOR = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-destructive/15 text-destructive",
  canceled: "bg-amber-100 text-amber-700",
};

export default function FileCard({
  item,
  isSelected,
  onSelect,
  onDownload,
  onRetry,
  onRemove,
}) {
  const reduction =
    item.status === "success" && item.output.size
      ? ((1 - item.output.size / item.input.size) * 100).toFixed(1)
      : null;

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-3",
        isSelected ? "ring-2 ring-primary/40" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.input.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(item.input.size)}
            {item.status === "success" ? ` → ${formatBytes(item.output.size)}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            STATUS_COLOR[item.status]
          )}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      {item.error?.message ? (
        <p className="mt-2 text-xs text-destructive">{item.error.message}</p>
      ) : null}

      {reduction ? (
        <p className="mt-1 text-xs text-emerald-700">절감률 {reduction}%</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs"
          onClick={onSelect}
        >
          Preview
        </button>
        {item.status === "success" ? (
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={onDownload}
          >
            Download
          </button>
        ) : null}
        {item.status === "error" ? (
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : null}
        <button
          type="button"
          disabled={item.status === "processing"}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
