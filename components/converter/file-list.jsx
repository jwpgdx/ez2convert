"use client";

import { Files } from "lucide-react";
import FileCard from "./file-card";

export default function FileList({
  items,
  selectedId,
  onSelect,
  onDownload,
  onRetry,
  onRemove,
}) {
  if (items.length === 0) {
    return (
      <section className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        <div className="space-y-2">
          <Files className="mx-auto h-5 w-5 text-foreground" aria-hidden="true" />
          <p>No files in the queue yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      {items.map((item) => (
        <FileCard
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          onSelect={() => onSelect?.(item.id)}
          onDownload={() => onDownload?.(item)}
          onRetry={() => onRetry?.(item.id)}
          onRemove={() => onRemove?.(item.id)}
        />
      ))}
    </section>
  );
}
