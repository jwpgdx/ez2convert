"use client";

import { useRef, useState } from "react";
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
        "rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border bg-card",
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

      <p className="text-sm text-muted-foreground">
        Drop files here or choose files. Supported: {supportedDescription}.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Choose files
      </button>
    </div>
  );
}
