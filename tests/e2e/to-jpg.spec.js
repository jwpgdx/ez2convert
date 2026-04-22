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

async function openJpgConverter(page) {
  await page.goto(APP_ROUTES.TO_JPG);
  await expect(
    page.getByRole("heading", { name: ROUTE_TITLES[APP_ROUTES.TO_JPG] })
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

test.describe("to-jpg route", () => {
  test("renders /to-jpg and shows jpg-only settings", async ({ page }) => {
    await openJpgConverter(page);
    await expect(page.getByText("Output FPS (common)")).toHaveCount(0);
    await expect(page.getByText("Loop (common, 0 = infinite)")).toHaveCount(0);
    await expect(page.getByText("Lossless output")).toHaveCount(0);
    await expect(page.getByText("JPG options")).toBeVisible();
  });

  test("converts PNG to JPG and supports download", async ({ page }) => {
    await openJpgConverter(page);
    await uploadFiles(page, [pngFile("tiny.png")]);
    await startConversion(page);

    const card = await cardByName(page, "tiny.png");
    await expect(card.getByRole("button", { name: "Download" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await card.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("tiny.jpg");
  });

  test("applies jpg option controls without crashing conversion", async ({
    page,
  }) => {
    await openJpgConverter(page);
    await uploadFiles(page, [jpgFile("opt.jpg")]);

    await page.getByRole("checkbox", { name: "Progressive JPEG" }).uncheck();
    await page.getByRole("combobox").first().selectOption("4:4:4");
    await page
      .locator('label:has-text("Background color for alpha input") input[type="text"]')
      .fill("#000000");

    await startConversion(page);
    const card = await cardByName(page, "opt.jpg");
    await expect(card.getByRole("button", { name: "Download" })).toBeVisible();
  });

  test("rejects animated GIF input in to-jpg queue", async ({ page }) => {
    await openJpgConverter(page);
    await uploadFiles(page, [gifFile("animated.gif")]);
    await expect(
      page.getByText("Animated images are not supported in this conversion path.")
    ).toBeVisible();
  });
});
