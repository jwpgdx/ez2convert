import { getSiteUrl } from "@/lib/config/site";

const SITE_NAME = "EZ2 Convert";

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  noindex = false,
}) {
  const siteUrl = getSiteUrl();
  const url = new URL(path, siteUrl).toString();

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}
