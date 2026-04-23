import AvifConverterShell from "@/components/converter/avif-converter-shell";
import SiteFooter from "@/components/site/site-footer";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata = buildPageMetadata({
  title: ROUTE_TITLES[APP_ROUTES.TO_AVIF],
  description:
    "Convert static images to AVIF locally in your browser for compact, modern output.",
  path: APP_ROUTES.TO_AVIF,
  keywords: [
    "image to avif",
    "webp to avif",
    "avif converter",
    "jpg to avif",
  ],
});

const NOTICE_ITEMS = [
  "All conversion is processed in your browser locally. No upload to server.",
  "AVIF output supports transparency. Alpha is preserved for PNG/WEBP inputs.",
  "Lossless mode forces quality to 100.",
  "AVIF encoding uses a wasm encoder and may take longer on first run.",
  "Limits: file 50MB, max dimension 8192px, max pixels 25MP, batch up to 50 files.",
];

export default function ToAvifPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AvifConverterShell />
      <SiteFooter noticeItems={NOTICE_ITEMS} />
    </main>
  );
}
