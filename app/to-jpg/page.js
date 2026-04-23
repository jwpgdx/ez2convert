import JpgConverterShell from "@/components/converter/jpg-converter-shell";
import SiteFooter from "@/components/site/site-footer";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata = buildPageMetadata({
  title: ROUTE_TITLES[APP_ROUTES.TO_JPG],
  description:
    "Convert PNG, WebP, and other static images to JPG locally in your browser.",
  path: APP_ROUTES.TO_JPG,
  keywords: [
    "webp to jpg",
    "png to jpg",
    "image to jpg",
    "jpeg converter",
  ],
});

const NOTICE_ITEMS = [
  "All conversion is processed in your browser locally. No upload to server.",
  "JPG output does not support transparency. Transparent pixels are flattened with the selected background color.",
  "Metadata is stripped in current browser-side pipeline.",
  "Limits: file 50MB, max dimension 8192px, max pixels 25MP, batch up to 50 files.",
];

export default function ToJpgPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <JpgConverterShell />
      <SiteFooter noticeItems={NOTICE_ITEMS} />
    </main>
  );
}
