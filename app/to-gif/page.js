import GifConverterShell from "@/components/converter/gif-converter-shell";
import SiteFooter from "@/components/site/site-footer";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata = buildPageMetadata({
  title: ROUTE_TITLES[APP_ROUTES.TO_GIF],
  description:
    "Convert images and short videos to GIF locally in your browser with timing and resize controls.",
  path: APP_ROUTES.TO_GIF,
  keywords: [
    "image to gif",
    "video to gif",
    "webp to gif",
    "gif converter",
  ],
});

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
      <SiteFooter noticeItems={NOTICE_ITEMS} />
    </main>
  );
}
