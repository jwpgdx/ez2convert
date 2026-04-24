import SiteFooter from "@/components/site/site-footer";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata = buildPageMetadata({
  title: "Privacy",
  description:
    "Read how EZ2 File handles files, browser processing, downloads, and basic hosting logs.",
  path: "/privacy",
  keywords: [
    "ez2 file privacy",
    "browser image converter privacy",
    "local file conversion privacy",
  ],
});

const SECTIONS = [
  {
    title: "Files stay in your browser for conversion",
    body:
      "EZ2 File is built so supported conversions run locally in your browser. Your files are not intentionally uploaded to a conversion server as part of the normal conversion flow.",
  },
  {
    title: "Downloads are generated on your device",
    body:
      "Converted files and ZIP downloads are created in the browser session and then saved through your browser download flow. If you close the tab or reset the queue, those temporary in-browser results are discarded.",
  },
  {
    title: "Standard hosting requests still exist",
    body:
      "Like most websites, Firebase Hosting may receive basic request information such as IP address, user agent, and request time so the site can be delivered securely and reliably. That is separate from the actual conversion pipeline.",
  },
  {
    title: "Metadata and content handling",
    body:
      "Some conversion targets strip metadata such as EXIF, ICC, or GPS information. That behavior depends on the destination format and current browser-side codec path. Check the route notes if metadata retention matters for your use case.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 md:px-8">
        <div className="space-y-4 border-b border-border pb-6">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            EZ2 File
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold md:text-4xl">Privacy</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              The short version: conversions are designed to stay local in your
              browser, while normal hosting requests still apply when loading
              the site itself.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
