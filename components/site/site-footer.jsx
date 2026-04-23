import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/to-webp", label: "WebP" },
  { href: "/to-png", label: "PNG" },
  { href: "/to-jpg", label: "JPG" },
  { href: "/to-avif", label: "AVIF" },
  { href: "/to-gif", label: "GIF" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/sitemap.xml", label: "Sitemap" },
];

export default function SiteFooter({ noticeItems = [] }) {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-6 md:px-8">
        {noticeItems.length > 0 ? (
          <div className="space-y-2 text-xs leading-5 text-muted-foreground md:text-sm">
            {noticeItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground md:text-sm">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-xs leading-5 text-muted-foreground md:text-sm">
          EZ2 Convert runs conversions in your browser so files do not need to
          be uploaded for processing.
        </p>
      </div>
    </footer>
  );
}
