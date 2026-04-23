"use client";

import { Download, Eye, RefreshCw, X } from "lucide-react";
import { formatBytes } from "@/lib/format/format-bytes";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  success: "Done",
  error: "Failed",
  canceled: "Canceled",
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
  const isReduced = Number(reduction) >= 0;

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-shadow",
        isSelected ? "ring-2 ring-primary/40" : "hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">{item.input.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(item.input.size)}
            {item.status === "success"
              ? ` -> ${formatBytes(item.output.size)}`
              : ""}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium",
            STATUS_COLOR[item.status]
          )}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      {item.error?.message ? (
        <p className="mt-3 text-xs leading-5 text-destructive">
          {item.error.message}
        </p>
      ) : null}

      {reduction ? (
        <p
          className={cn(
            "mt-2 text-xs",
            isReduced ? "text-emerald-700" : "text-amber-700"
          )}
        >
          {isReduced ? "Saved" : "Larger by"} {Math.abs(Number(reduction))}%
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
          onClick={onSelect}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Preview
        </button>
        {item.status === "success" ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
            onClick={onDownload}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download
          </button>
        ) : null}
        {item.status === "error" ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
            onClick={onRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        ) : null}
        <button
          type="button"
          disabled={item.status === "processing"}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>
    </article>
  );
}
