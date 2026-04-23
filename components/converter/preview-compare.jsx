"use client";

import { useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";
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
      <section className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        <div className="space-y-2">
          <ImageIcon className="mx-auto h-5 w-5 text-foreground" aria-hidden="true" />
          <p>Select a file to compare before and after.</p>
        </div>
      </section>
    );
  }

  const reduction =
    item.status === "success" && item.output.size
      ? ((1 - item.output.size / item.input.size) * 100).toFixed(1)
      : null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
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
              <span className="text-xs text-muted-foreground">No preview</span>
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
              <span className="text-xs text-muted-foreground">No output yet</span>
            )}
          </div>
        </figure>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Original {formatBytes(item.input.size)}
        {item.output?.size ? ` -> Converted ${formatBytes(item.output.size)}` : ""}
        {reduction ? ` (${reduction}% saved)` : ""}
      </p>
    </section>
  );
}
