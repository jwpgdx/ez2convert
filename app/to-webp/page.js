import ConverterShell from "@/components/converter/converter-shell";
import SiteFooter from "@/components/site/site-footer";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata = buildPageMetadata({
  title: ROUTE_TITLES[APP_ROUTES.TO_WEBP],
  description:
    "Convert JPG, PNG, GIF, APNG, and short video files to WebP locally in your browser.",
  path: APP_ROUTES.TO_WEBP,
  keywords: [
    "image to webp",
    "jpg to webp",
    "png to webp",
    "gif to webp",
    "video to webp",
  ],
});

const NOTICE_ITEMS = [
  "All conversion is processed in your browser locally. No upload to server.",
  "Output WebP does not preserve metadata (EXIF/GPS/ICC).",
  "Input now accepts JPG/JPEG, PNG, GIF, APNG and common video formats.",
  "GIF/APNG and video conversion are processed with ffmpeg.wasm and may take longer on first run.",
  "Limits: file 50MB, max dimension 8192px, max pixels 25MP, batch up to 50 files.",
];

export default function ToWebpPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <ConverterShell />
      <SiteFooter noticeItems={NOTICE_ITEMS} />
    </main>
  );
}
