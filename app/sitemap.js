import { APP_ROUTES } from "@/lib/config/routes";
import { getSiteUrl } from "@/lib/config/site";

export default function sitemap() {
  const siteUrl = getSiteUrl();

  return [
    {
      url: `${siteUrl}${APP_ROUTES.TO_WEBP}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}${APP_ROUTES.TO_PNG}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${APP_ROUTES.TO_JPG}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${APP_ROUTES.TO_AVIF}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${APP_ROUTES.TO_GIF}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
