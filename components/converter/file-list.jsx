"use client";

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
      <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        업로드된 파일이 없습니다.
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
