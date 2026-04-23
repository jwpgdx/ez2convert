import PngConverterShell from "@/components/converter/png-converter-shell";
import SiteFooter from "@/components/site/site-footer";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata = buildPageMetadata({
  title: ROUTE_TITLES[APP_ROUTES.TO_PNG],
  description:
    "Convert WebP, JPG, and other static images to PNG locally in your browser.",
  path: APP_ROUTES.TO_PNG,
  keywords: [
    "webp to png",
    "jpg to png",
    "image to png",
    "png converter",
  ],
});

const NOTICE_ITEMS = [
  "All conversion is processed in your browser locally. No upload to server.",
  "When quality is below 100, quantization and optimization are both applied.",
  "When lossless is enabled or quality is 100, oxipng-only path is used.",
  "Resize is applied before PNG encoding stages.",
  "PNG is lossless. JPEG/WEBP to PNG can increase file size depending on source content.",
  "Limits: file 50MB, max dimension 8192px, max pixels 25MP, batch up to 50 files.",
];

export default function ToPngPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PngConverterShell />
      <SiteFooter noticeItems={NOTICE_ITEMS} />
    </main>
  );
}
