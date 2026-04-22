import { Zip, ZipDeflate } from "fflate";
import { CONVERSION_LIMITS } from "@/lib/converters/constants";

function getSafeSiteName(fileName) {
  return fileName.replace(/[\\/:*?"<>|]+/g, "_");
}

function splitFileName(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return { base: fileName, ext: "" };
  }
  return {
    base: fileName.slice(0, dotIndex),
    ext: fileName.slice(dotIndex),
  };
}

function getUniqueFileName(fileName, usedNames) {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const { base, ext } = splitFileName(fileName);
  let index = 1;
  while (usedNames.has(`${base} (${index})${ext}`)) {
    index += 1;
  }
  const nextName = `${base} (${index})${ext}`;
  usedNames.add(nextName);
  return nextName;
}

function formatZipName(prefix = "webp-converted", date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${prefix}_${year}-${month}-${day}_${hour}-${minute}.zip`;
}

export function getZipStats(items) {
  const successItems = items.filter(
    (item) => item.status === "success" && item.output?.blob
  );
  const totalBytes = successItems.reduce(
    (acc, item) => acc + (item.output.size || item.output.blob.size || 0),
    0
  );

  return {
    successItems,
    totalBytes,
    shouldWarn: totalBytes > CONVERSION_LIMITS.warnZipTotalBytes,
    exceedsLimit: totalBytes > CONVERSION_LIMITS.maxZipTotalBytes,
  };
}

async function buildZipBlob(entries) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const zip = new Zip((error, data, final) => {
      if (error) {
        reject(error);
        return;
      }
      // fflate 재사용 버퍼로 전달할 수 있어 복사본을 저장한다.
      chunks.push(new Uint8Array(data));
      if (final) {
        resolve(new Blob(chunks, { type: "application/zip" }));
      }
    });

    const run = async () => {
      for (const entry of entries) {
        const data = new Uint8Array(await entry.blob.arrayBuffer());
        const file = new ZipDeflate(entry.fileName, { level: 6 });
        zip.add(file);
        file.push(data, true);
      }
      zip.end();
    };

    run().catch((error) => {
      zip.end();
      reject(error);
    });
  });
}

export async function createZipBlobFromItems(items) {
  const { successItems } = getZipStats(items);
  const usedNames = new Set();

  const entries = successItems.map((item) => {
    const normalizedName = getSafeSiteName(item.output.name);
    const fileName = getUniqueFileName(normalizedName, usedNames);
    return {
      fileName,
      blob: item.output.blob,
    };
  });

  return buildZipBlob(entries);
}

export function createZipFileName(prefix = "webp-converted") {
  return formatZipName(prefix);
}
