import { expect, test } from "@playwright/test";
import { APP_ROUTES, ROUTE_TITLES } from "../../lib/config/routes";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yf6kAAAAASUVORK5CYII=";
const JPG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAx" +
  "NDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
  "MjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAGQABAQEBAQEAAAAAAAAAAAAAAAQCAwUB/8QAHhAAAgICAgMAAAAAAAAAAAAA" +
  "AQIAAxEEEiExQWH/xAAVAQEBAAAAAAAAAAAAAAAAAAACBP/EABkRAQADAQEAAAAAAAAAAAAAAAABAhESIf/aAAwDAQACEQMRAD8A" +
  "4jWk3A1s4f/Z";
const GIF_BASE64 = "R0lGODdhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";

function pngFile(name = "sample.png") {
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(PNG_BASE64, "base64"),
  };
}

function jpgFile(name = "sample.jpg") {
  return {
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from(JPG_BASE64, "base64"),
  };
}

function gifFile(name = "animated.gif") {
  return {
    name,
    mimeType: "image/gif",
    buffer: Buffer.from(GIF_BASE64, "base64"),
  };
}

function mp4File(name = "sample.mp4") {
  return {
    name,
    mimeType: "video/mp4",
    buffer: Buffer.from("not-real-video-data"),
  };
}

async function recordedWebmFile(page, name = "recorded.webm") {
  const payload = await page.evaluate(async () => {
    if (typeof MediaRecorder === "undefined") {
      return null;
    }

    const mimeCandidates = ["video/webm;codecs=vp8", "video/webm"];
    const mimeType =
      mimeCandidates.find((value) =>
        typeof MediaRecorder.isTypeSupported === "function"
          ? MediaRecorder.isTypeSupported(value)
          : value === "video/webm"
      ) || "video/webm";

    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    let frame = 0;
    const draw = () => {
      const hue = (frame * 17) % 360;
      context.fillStyle = `hsl(${hue} 75% 50%)`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect((frame * 3) % 70, 18, 26, 26);
      frame += 1;
    };

    draw();
    const timer = window.setInterval(draw, 80);

    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.start(100);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    recorder.stop();

    await new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = () => reject(new Error("media recorder failed"));
    });

    window.clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());

    const blob = new Blob(chunks, { type: mimeType });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return {
      mimeType,
      base64: btoa(binary),
    };
  });

  if (!payload?.base64) {
    throw new Error("failed to generate recorded webm fixture");
  }

  return {
    name,
    mimeType: payload.mimeType || "video/webm",
    buffer: Buffer.from(payload.base64, "base64"),
  };
}

function apngFile(name = "animated.png") {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const createChunk = (type, data = Buffer.alloc(0)) => {
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    return Buffer.concat([size, typeBuffer, data, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(1, 0);
  actl.writeUInt32BE(0, 4);

  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.concat([
      signature,
      createChunk("IHDR", ihdr),
      createChunk("acTL", actl),
      createChunk("IEND"),
    ]),
  };
}

function textFile(name = "notes.txt") {
  return {
    name,
    mimeType: "text/plain",
    buffer: Buffer.from("unsupported type"),
  };
}

function manyPngFiles(count) {
  return Array.from({ length: count }, (_, index) => pngFile(`many-${index}.png`));
}

async function openConverter(page) {
  await page.goto(APP_ROUTES.TO_WEBP);
  await expect(
    page.getByRole("heading", { name: ROUTE_TITLES[APP_ROUTES.TO_WEBP] })
  ).toBeVisible();
}

async function uploadFiles(page, files, options = {}) {
  await page.locator('input[type="file"]').setInputFiles(files);

  if (options.waitForItems === false || files.length === 0) {
    return;
  }

  await expect(
    page.locator("article").filter({ hasText: files[0].name })
  ).toBeVisible();
}

async function startConversion(page) {
  await page.getByRole("button", { name: "Start" }).click();
}

async function cardByName(page, fileName) {
  return page.locator("article").filter({ hasText: fileName });
}

async function expectSuccessCard(page, fileName) {
  const card = await cardByName(page, fileName);
  await expect(card.getByRole("button", { name: "Download" })).toBeVisible();
  return card;
}

async function expectErrorCard(page, fileName) {
  const card = await cardByName(page, fileName);
  await expect(card.getByRole("button", { name: "Retry" })).toBeVisible();
  return card;
}

test.describe("converter smoke", () => {
  test("redirects root to /to-webp", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`${APP_ROUTES.TO_WEBP}$`));
    await expect(
      page.getByRole("heading", { name: ROUTE_TITLES[APP_ROUTES.TO_WEBP] })
    ).toBeVisible();
  });

  test("redirects public aliases to canonical converter routes", async ({
    page,
  }) => {
    const aliasCases = [
      ["/jpg-to-webp", APP_ROUTES.TO_WEBP],
      ["/webp2png", APP_ROUTES.TO_PNG],
      ["/webp2jpg", APP_ROUTES.TO_JPG],
      ["/webp2avif", APP_ROUTES.TO_AVIF],
      ["/webp2gif", APP_ROUTES.TO_GIF],
    ];

    for (const [alias, canonicalRoute] of aliasCases) {
      await page.goto(`${alias}?source=e2e`);
      await expect(page).toHaveURL(
        new RegExp(`${canonicalRoute}\\?source=e2e$`)
      );
    }
  });

  test("converts PNG and supports single download", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [pngFile("tiny.png")]);
    await startConversion(page);

    const card = await expectSuccessCard(page, "tiny.png");
    const downloadPromise = page.waitForEvent("download");
    await card.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("tiny.webp");
  });

  test("converts JPG successfully", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [jpgFile("tiny.jpg")]);
    await startConversion(page);
    await expectSuccessCard(page, "tiny.jpg");
  });

  test("converts GIF successfully", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [gifFile("tiny.gif")]);
    await startConversion(page);
    await expectSuccessCard(page, "tiny.gif");
  });

  test("downloads ZIP after converting multiple files", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [pngFile("one.png"), jpgFile("two.jpg")]);
    await startConversion(page);
    await expectSuccessCard(page, "one.png");
    await expectSuccessCard(page, "two.jpg");

    const zipButton = page.getByRole("button", { name: /ZIP/ });
    await expect(zipButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await zipButton.click();
    const download = await downloadPromise;
    await expect(download.suggestedFilename()).toMatch(
      /^webp-converted_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.zip$/
    );
  });

  test("reset clears uploaded items", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [pngFile("reset.png")]);
    await expect(await cardByName(page, "reset.png")).toBeVisible();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.locator("article")).toHaveCount(0);
  });

  test("mixed queue converts JPG and GIF together", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [jpgFile("mixed.jpg"), gifFile("mixed.gif")]);
    await startConversion(page);
    await expectSuccessCard(page, "mixed.jpg");
    await expectSuccessCard(page, "mixed.gif");
  });

  test("shows animated-only options only when animated file exists in queue", async ({
    page,
  }) => {
    await openConverter(page);

    await expect(
      page.getByText("Animated options (GIF/APNG only)")
    ).toHaveCount(0);

    await uploadFiles(page, [pngFile("plain.png")]);
    await expect(
      page.getByText("Animated options (GIF/APNG only)")
    ).toHaveCount(0);

    await uploadFiles(page, [gifFile("with-animation.gif")]);
    await expect(
      page.getByText("Animated options (GIF/APNG only)")
    ).toBeVisible();
  });

  test("shows video options when video file exists in queue", async ({ page }) => {
    await openConverter(page);

    await expect(page.getByText("Video options")).toHaveCount(0);

    await uploadFiles(page, [mp4File("clip.mp4")]);
    await expect(page.getByText("Video options")).toBeVisible();
  });

  test("converts recorded WEBM video successfully", async ({ page }) => {
    await openConverter(page);
    const video = await recordedWebmFile(page, "recorded.webm");
    await uploadFiles(page, [video]);
    await startConversion(page);
    await expectSuccessCard(page, "recorded.webm");
  });

  test("video max-frames guard rejects conversion when configured too low", async ({
    page,
  }) => {
    await openConverter(page);
    const video = await recordedWebmFile(page, "guard.webm");
    await uploadFiles(page, [video]);

    await expect(page.getByText("Video options")).toBeVisible();
    await page.locator('label:has-text("Max frames") input').fill("1");

    await startConversion(page);
    const card = await expectErrorCard(page, "guard.webm");
    await expect(
      card.getByText("Estimated video frame count exceeded. Lower FPS or trim video.")
    ).toBeVisible();
  });
});

test.describe("validation and failure paths", () => {
  test("apng regression path marks item as error when conversion fails", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [apngFile("animated.png")]);
    await startConversion(page);
    await expectErrorCard(page, "animated.png");
  });

  test("rejects unsupported file type", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, [textFile()], { waitForItems: false });
    await expect(
      page.getByText(
        "Unsupported file format. Allowed: JPG/JPEG, PNG, GIF/APNG, common video formats."
      )
    ).toBeVisible();
  });

  test("rejects files over max batch count", async ({ page }) => {
    await openConverter(page);
    await uploadFiles(page, manyPngFiles(51));
    await expect(page.locator("article")).toHaveCount(50);
    await expect(
      page.getByText("Too many files in one batch. (max 50 files)")
    ).toBeVisible();
  });

  test("video item is routed and fails with deterministic encode error for invalid fixture", async ({
    page,
  }) => {
    await openConverter(page);
    await uploadFiles(page, [mp4File("movie.mp4")]);
    await startConversion(page);
    const card = await expectErrorCard(page, "movie.mp4");
    await expect(card.getByText("Failed to encode video to WebP output.")).toBeVisible();
  });
});
