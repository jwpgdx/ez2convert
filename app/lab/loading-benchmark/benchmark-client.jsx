"use client";

import { useMemo, useState } from "react";

const DEFAULT_RUN_COUNT = 2;
const MAX_RUN_COUNT = 5;

function formatMs(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)} ms`;
}

function getErrorText(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

async function measureStep(label, action) {
  const startedAt = performance.now();

  try {
    await action();
    return {
      label,
      ok: true,
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    return {
      label,
      ok: false,
      durationMs: performance.now() - startedAt,
      error: getErrorText(error),
    };
  }
}

async function runSingleBenchmark() {
  const steps = [];
  let libwebpModule;
  let ffmpegModule;

  steps.push(
    await measureStep("libwebp-wasm import()", async () => {
      libwebpModule = await import("libwebp-wasm");
    })
  );
  if (!steps[steps.length - 1].ok) return steps;

  steps.push(
    await measureStep("libwebp-wasm init()", async () => {
      await libwebpModule.init();
    })
  );
  if (!steps[steps.length - 1].ok) return steps;

  steps.push(
    await measureStep("libwebp-wasm destroy()", async () => {
      libwebpModule.destroy();
    })
  );
  if (!steps[steps.length - 1].ok) return steps;

  steps.push(
    await measureStep("@ffmpeg/ffmpeg import()", async () => {
      ffmpegModule = await import("@ffmpeg/ffmpeg");
    })
  );
  if (!steps[steps.length - 1].ok) return steps;

  steps.push(
    await measureStep("FFmpeg.load() (core download + init)", async () => {
      const ffmpeg = new ffmpegModule.FFmpeg();

      try {
        await ffmpeg.load();
      } finally {
        ffmpeg.terminate();
      }
    })
  );

  return steps;
}

function buildSummary(runs) {
  if (runs.length === 0) {
    return [];
  }

  const labels = Array.from(
    new Set(runs.flatMap((run) => run.steps.map((step) => step.label)))
  );

  return labels.map((label) => {
    const samples = runs
      .map((run) => run.steps.find((step) => step.label === label))
      .filter((step) => step && step.ok)
      .map((step) => step.durationMs);

    if (samples.length === 0) {
      return {
        label,
        avgMs: NaN,
        minMs: NaN,
        maxMs: NaN,
      };
    }

    const total = samples.reduce((sum, value) => sum + value, 0);

    return {
      label,
      avgMs: total / samples.length,
      minMs: Math.min(...samples),
      maxMs: Math.max(...samples),
    };
  });
}

export default function BenchmarkClient() {
  const [runCount, setRunCount] = useState(DEFAULT_RUN_COUNT);
  const [runs, setRuns] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fatalError, setFatalError] = useState("");

  const summary = useMemo(() => buildSummary(runs), [runs]);

  const connectionInfo = useMemo(() => {
    if (typeof navigator === "undefined") {
      return "Unavailable";
    }

    const connection = navigator.connection;
    if (!connection) {
      return "Unavailable";
    }

    const parts = [];
    if (connection.effectiveType) parts.push(`effectiveType=${connection.effectiveType}`);
    if (Number.isFinite(connection.downlink)) parts.push(`downlink=${connection.downlink}Mbps`);
    if (Number.isFinite(connection.rtt)) parts.push(`rtt=${connection.rtt}ms`);

    return parts.length > 0 ? parts.join(", ") : "Unavailable";
  }, []);

  const handleRun = async () => {
    setIsRunning(true);
    setRuns([]);
    setFatalError("");

    try {
      for (let i = 1; i <= runCount; i += 1) {
        const startedAt = new Date().toISOString();
        const steps = await runSingleBenchmark();
        const failed = steps.find((step) => !step.ok);

        setRuns((previous) => [
          ...previous,
          {
            runIndex: i,
            startedAt,
            steps,
            failed: Boolean(failed),
          },
        ]);

        if (failed) {
          break;
        }
      }
    } catch (error) {
      setFatalError(getErrorText(error));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 md:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">WASM Loading Benchmark</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Measure client-side loading time for <code>libwebp-wasm</code> and{" "}
          <code>@ffmpeg/ffmpeg</code>.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <label htmlFor="runCount" className="text-sm font-medium">
              Run count
            </label>
            <div>
              <input
                id="runCount"
                type="number"
                min={1}
                max={MAX_RUN_COUNT}
                value={runCount}
                disabled={isRunning}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  if (!Number.isFinite(parsed)) return;
                  const next = Math.max(1, Math.min(MAX_RUN_COUNT, Math.floor(parsed)));
                  setRunCount(next);
                }}
                className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run benchmark"}
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Network hint: {connectionInfo}
        </p>
      </div>

      {fatalError ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Fatal error: {fatalError}
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Summary</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Step</th>
                    <th className="px-2 py-2 font-medium">Avg</th>
                    <th className="px-2 py-2 font-medium">Min</th>
                    <th className="px-2 py-2 font-medium">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((item) => (
                    <tr key={item.label} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-2">{item.label}</td>
                      <td className="px-2 py-2">{formatMs(item.avgMs)}</td>
                      <td className="px-2 py-2">{formatMs(item.minMs)}</td>
                      <td className="px-2 py-2">{formatMs(item.maxMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {runs.map((run) => (
            <div key={run.runIndex} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">
                Run #{run.runIndex}{" "}
                <span className="font-normal text-muted-foreground">({run.startedAt})</span>
              </h3>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Step</th>
                      <th className="px-2 py-2 font-medium">Duration</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.steps.map((step) => (
                      <tr key={`${run.runIndex}-${step.label}`} className="border-b border-border/60 last:border-0">
                        <td className="px-2 py-2">{step.label}</td>
                        <td className="px-2 py-2">{formatMs(step.durationMs)}</td>
                        <td className="px-2 py-2">
                          {step.ok ? (
                            <span className="text-emerald-600">ok</span>
                          ) : (
                            <span className="text-destructive">failed: {step.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
