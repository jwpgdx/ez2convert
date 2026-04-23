export const APP_ROUTES = Object.freeze({
  HOME: "/",
  TO_WEBP: "/to-webp",
  TO_PNG: "/to-png",
  TO_JPG: "/to-jpg",
  TO_AVIF: "/to-avif",
  TO_GIF: "/to-gif",
});

export const CANONICAL_ROUTES = Object.freeze({
  WEBP: APP_ROUTES.TO_WEBP,
  PNG: APP_ROUTES.TO_PNG,
  JPG: APP_ROUTES.TO_JPG,
  AVIF: APP_ROUTES.TO_AVIF,
  GIF: APP_ROUTES.TO_GIF,
});

export const DEFAULT_LANDING_ROUTE = APP_ROUTES.TO_WEBP;

export const ROUTE_TITLES = Object.freeze({
  [APP_ROUTES.TO_WEBP]: "Image to WebP",
  [APP_ROUTES.TO_PNG]: "Image to PNG",
  [APP_ROUTES.TO_JPG]: "Image to JPG",
  [APP_ROUTES.TO_AVIF]: "Image to AVIF",
  [APP_ROUTES.TO_GIF]: "Image to GIF",
});

export const ROUTE_ALIASES = Object.freeze({
  [APP_ROUTES.TO_WEBP]: Object.freeze([
    "/jpg-to-webp",
    "/png-to-webp",
    "/gif-to-webp",
    "/video-to-webp",
    "/webp-converter",
    "/ez2webp",
  ]),
  [APP_ROUTES.TO_PNG]: Object.freeze([
    "/webp-to-png",
    "/webp2png",
    "/image-to-png",
    "/ez2png",
  ]),
  [APP_ROUTES.TO_JPG]: Object.freeze([
    "/webp-to-jpg",
    "/webp2jpg",
    "/image-to-jpg",
    "/ez2jpg",
  ]),
  [APP_ROUTES.TO_AVIF]: Object.freeze([
    "/image-to-avif",
    "/webp-to-avif",
    "/webp2avif",
    "/ez2avif",
  ]),
  [APP_ROUTES.TO_GIF]: Object.freeze([
    "/image-to-gif",
    "/video-to-gif",
    "/webp-to-gif",
    "/webp2gif",
    "/ez2gif",
  ]),
});

export const ALIAS_TO_CANONICAL_ROUTE = Object.freeze(
  Object.fromEntries(
    Object.entries(ROUTE_ALIASES).flatMap(([canonicalRoute, aliases]) =>
      aliases.map((alias) => [alias.replace(/^\//, ""), canonicalRoute])
    )
  )
);
