import BenchmarkClient from "./benchmark-client";

export const metadata = {
  title: "WASM Loading Benchmark",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoadingBenchmarkPage() {
  return (
    <main className="min-h-screen bg-background">
      <BenchmarkClient />
    </main>
  );
}
