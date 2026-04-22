"use client";

export default function ToastStack({ toasts, onClose }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-[320px] rounded-lg border border-border bg-background px-3 py-2 shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-foreground">{toast.message}</p>
            <button
              type="button"
              onClick={() => onClose?.(toast.id)}
              className="text-xs text-muted-foreground"
            >
              닫기
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
