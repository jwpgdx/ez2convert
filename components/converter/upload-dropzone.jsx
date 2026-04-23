"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_INPUT_DESCRIPTION,
  UPLOAD_ACCEPT,
} from "@/lib/config/file-types";

export default function UploadDropzone({
  disabled,
  onAddFiles,
  accept = UPLOAD_ACCEPT,
  supportedDescription = SUPPORTED_INPUT_DESCRIPTION,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) {
      return;
    }
    onAddFiles?.(files);
  };

  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-foreground/30",
        disabled ? "opacity-60" : ""
      )}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setIsDragging(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled) {
          return;
        }
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-background">
        <Upload className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="mt-4 max-w-md space-y-1">
        <p className="text-base font-semibold">Drop files here</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose files or drag a batch into the browser. Supported:{" "}
          {supportedDescription}.
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Choose files
      </button>
    </div>
  );
}
