import GifConverterShell from "@/components/converter/gif-converter-shell";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";

export const metadata = {
  title: ROUTE_TITLES[APP_ROUTES.TO_GIF],
  alternates: {
    canonical: APP_ROUTES.TO_GIF,
  },
};

const NOTICE_ITEMS = [
  "All conversion is processed in your browser locally. No upload to server.",
  "GIF is palette-based (max 256 colors). Photo inputs can become larger than the original.",
  "GIF supports 1-bit transparency only. Semi-transparent pixels are flattened with the selected background color.",
  "Animated/video to GIF uses ffmpeg.wasm and may take longer on first run.",
  "Limits: file 50MB, max dimension 8192px, max pixels 25MP, batch up to 50 files.",
];

export default function ToGifPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <GifConverterShell />

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto w-full max-w-5xl space-y-2 px-6 py-6 text-xs leading-5 text-muted-foreground md:px-8 md:text-sm">
          {NOTICE_ITEMS.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </footer>
    </main>
  );
}

