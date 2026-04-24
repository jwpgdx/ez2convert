"use client";

import { Image as ImageIcon, LockKeyhole, MonitorUp, ShieldCheck } from "lucide-react";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";
import { cn } from "@/lib/utils";

const FORMAT_TABS = [
  { route: APP_ROUTES.TO_WEBP, label: "WebP" },
  { route: APP_ROUTES.TO_PNG, label: "PNG" },
  { route: APP_ROUTES.TO_JPG, label: "JPG" },
  { route: APP_ROUTES.TO_AVIF, label: "AVIF" },
  { route: APP_ROUTES.TO_GIF, label: "GIF" },
];

const DEFAULT_BADGES = ["Local only", "No upload", "Batch ready"];

export default function ConverterHeader({
  activeRoute,
  description,
  badges = DEFAULT_BADGES,
}) {
  return (
    <header className="space-y-5">
      <div className="grid gap-5 border-b border-border pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
            <MonitorUp className="h-3.5 w-3.5" aria-hidden="true" />
            EZ2 File
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold md:text-4xl">
              {ROUTE_TITLES[activeRoute]}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-foreground" aria-hidden="true" />
            <span>Files stay in this browser.</span>
          </div>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-foreground" aria-hidden="true" />
            <span>Preview before download.</span>
          </div>
        </div>
      </div>

      <nav
        aria-label="Converter formats"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {FORMAT_TABS.map((tab) => {
          const isActive = tab.route === activeRoute;

          return (
            <a
              key={tab.route}
              href={tab.route}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-w-20 items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
