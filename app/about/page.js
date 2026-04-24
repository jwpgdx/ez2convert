import Link from "next/link";
import SiteFooter from "@/components/site/site-footer";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata = buildPageMetadata({
  title: "About",
  description:
    "Learn what EZ2 File does, which formats it supports, and why it keeps conversion local in your browser.",
  path: "/about",
  keywords: [
    "about ez2 file",
    "local browser converter",
    "image converter web app",
    "video to webp browser",
  ],
});

const SECTIONS = [
  {
    title: "What it does",
    body:
      "EZ2 File is a browser-based converter for WebP, PNG, JPG, AVIF, GIF, and selected short video workflows. It is designed to handle common upload, blog, marketplace, and messaging format changes without sending your file to a conversion server.",
  },
  {
    title: "Why local processing matters",
    body:
      "Most conversions run directly in your browser with wasm-based codecs and client-side processing. That keeps turnaround fast for small batches and reduces privacy concerns for routine image work.",
  },
  {
    title: "What to expect",
    body:
      "Animated formats and video inputs can take longer on first run because browser codecs and ffmpeg.wasm assets need to load. Some formats also strip metadata or flatten transparency depending on the target output.",
  },
  {
    title: "Where to send feedback",
    body:
      "If something breaks or a format is missing, the best place to track it is the GitHub repository for this project. That keeps bug reports and feature requests in one place.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 md:px-8">
        <div className="space-y-4 border-b border-border pb-6">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            EZ2 File
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold md:text-4xl">About</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              A local converter for common image and short video format changes,
              built to stay fast, simple, and browser-first.
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

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Project links</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link
                href="/to-webp"
                className="rounded-md border border-border bg-background px-3 py-2 transition-colors hover:text-foreground"
              >
                Open converter
              </Link>
              <a
                href="https://github.com/jwpgdx/ez2convert"
                className="rounded-md border border-border bg-background px-3 py-2 transition-colors hover:text-foreground"
              >
                GitHub repository
              </a>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
