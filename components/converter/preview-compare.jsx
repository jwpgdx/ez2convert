"use client";

import { useEffect } from "react";
import { formatBytes } from "@/lib/format/format-bytes";

export default function PreviewCompare({ item }) {
  const beforeUrl = item?.file ? URL.createObjectURL(item.file) : null;

  useEffect(() => {
    return () => {
      if (beforeUrl) {
        URL.revokeObjectURL(beforeUrl);
      }
    };
  }, [beforeUrl]);

  if (!item) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        파일을 선택하면 Before/After 미리보기를 표시합니다.
      </section>
    );
  }

  const reduction =
    item.status === "success" && item.output.size
      ? ((1 - item.output.size / item.input.size) * 100).toFixed(1)
      : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Before / After</h2>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <figure className="space-y-2">
          <figcaption className="text-xs text-muted-foreground">Before</figcaption>
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
            {beforeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={beforeUrl}
                alt="Original preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">미리보기 없음</span>
            )}
          </div>
        </figure>

        <figure className="space-y-2">
          <figcaption className="text-xs text-muted-foreground">After</figcaption>
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
            {item.output?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.output.url}
                alt="Converted preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">변환 결과 없음</span>
            )}
          </div>
        </figure>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        원본 {formatBytes(item.input.size)}
        {item.output?.size ? ` → 결과 ${formatBytes(item.output.size)}` : ""}
        {reduction ? ` (${reduction}% 절감)` : ""}
      </p>
    </section>
  );
}
