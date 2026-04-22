import JpgConverterShell from "@/components/converter/jpg-converter-shell";
import { APP_ROUTES, ROUTE_TITLES } from "@/lib/config/routes";

export const metadata = {
  title: ROUTE_TITLES[APP_ROUTES.TO_JPG],
  alternates: {
    canonical: APP_ROUTES.TO_JPG,
  },
};

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
