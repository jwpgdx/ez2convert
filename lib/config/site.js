export const DEFAULT_SITE_URL = "https://ez2file.web.app";

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || DEFAULT_SITE_URL
  );
}
