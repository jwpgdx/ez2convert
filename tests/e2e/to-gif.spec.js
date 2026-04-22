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

function gifFile(name = "sample.gif") {
  return {
    name,
    mimeType: "image/gif",
    buffer: Buffer.from(GIF_BASE64, "base64"),
  };
}

function invalidMp4File(name = "invalid.mp4") {
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
      const hue = (frame * 19) % 360;
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

async function openGifConverter(page) {
  await page.goto(APP_ROUTES.TO_GIF);
  await expect(
    page.getByRole("heading", { name: ROUTE_TITLES[APP_ROUTES.TO_GIF] })
  ).toBeVisible();
}

async function uploadFiles(page, files) {
  await page.locator('input[type="file"]').setInputFiles(files);
}

async function startConversion(page) {
  await page.getByRole("button", { name: "Start" }).click();
}

async function cardByName(page, fileName) {
  return page.locator("article").filter({ hasText: fileName });
}

test.describe("to-gif route", () => {
  test("renders /to-gif and shows gif-only settings", async ({ page }) => {
    await openGifConverter(page);
    await expect(page.getByText("GIF options")).toBeVisible();
    await expect(page.getByText("Lossless output")).toHaveCount(0);
    await expect(page.getByText("Output FPS (common)")).toBeVisible();
    await expect(page.getByText("Loop (common, 0 = infinite)")).toBeVisible();
  });

  test("converts JPG to GIF and supports download", async ({ page }) => {
    await openGifConverter(page);
    await uploadFiles(page, [jpgFile("tiny.jpg")]);
    await startConversion(page);

    const card = await cardByName(page, "tiny.jpg");
    await expect(card.getByRole("button", { name: "Download" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await card.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("tiny.gif");
  });

  test("converts animated GIF to GIF and supports download", async ({ page }) => {
    await openGifConverter(page);
    await uploadFiles(page, [gifFile("animated.gif")]);
    await startConversion(page);

    const card = await cardByName(page, "animated.gif");
    await expect(card.getByRole("button", { name: "Download" })).toBeVisible({
      timeout: 30_000,
    });

    const downloadPromise = page.waitForEvent("download");
    await card.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("animated.gif");
  });

  test("converts recorded WEBM video to GIF successfully", async ({ page }) => {
    await openGifConverter(page);
    const video = await recordedWebmFile(page, "recorded.webm");
    await uploadFiles(page, [video]);
    await startConversion(page);

    const card = await cardByName(page, "recorded.webm");
    await expect(card.getByRole("button", { name: "Download" })).toBeVisible({
      timeout: 45_000,
    });
  });

  test("video invalid regression marks item as error with deterministic message", async ({
    page,
  }) => {
    await openGifConverter(page);
    await uploadFiles(page, [invalidMp4File("bad.mp4")]);
    await startConversion(page);

    const card = await cardByName(page, "bad.mp4");
    await expect(card.getByText("Failed to encode video to GIF output.")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("static PNG alpha input converts to GIF without crashing", async ({
    page,
  }) => {
    await openGifConverter(page);
    await uploadFiles(page, [pngFile("alpha.png")]);
    await startConversion(page);

    const card = await cardByName(page, "alpha.png");
    await expect(card.getByRole("button", { name: "Download" })).toBeVisible();
  });
});

