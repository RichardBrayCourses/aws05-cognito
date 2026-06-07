import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { getTestUserToken } from "./lib/cognito";
import { apiFetch } from "./lib/api";
import { getApiBaseUrl } from "./lib/ssm";

function contentTypeFor(fileName: string) {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

async function main() {
  const apiBaseUrl = await getApiBaseUrl();
  const token = process.env.COGNITO_ID_TOKEN ?? await getTestUserToken("admin");
  const photosDir = resolve(process.env.PHOTOS_DIR ?? "../../photos-to-upload");
  const photoNames = (await readdir(photosDir)).filter((name) => !name.startsWith("."));

  if (photoNames.length === 0) {
    throw new Error(`No photos found in ${photosDir}.`);
  }

  console.log(`Using API: ${apiBaseUrl}`);
  console.log(`Deleting existing photos as administrator...`);

  const deleteResponse = await apiFetch(apiBaseUrl, "/auth/admin/photos", {
    method: "DELETE",
    headers: {
      Authorization: token,
    },
  });

  if (!deleteResponse.ok) {
    throw new Error(`Could not delete photos. HTTP ${deleteResponse.status}`);
  }

  for (const photoName of photoNames) {
    const uploadUrlResponse = await apiFetch(apiBaseUrl, "/auth/photos/presigned-url", {
      method: "POST",
      headers: {
        Authorization: token,
      },
    });

    if (!uploadUrlResponse.ok) {
      throw new Error(`Could not get upload URL. HTTP ${uploadUrlResponse.status}`);
    }

    const uploadUrl = await uploadUrlResponse.text();
    const photoPath = join(photosDir, photoName);
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentTypeFor(photoName),
      },
      body: await readFile(photoPath),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Could not upload ${photoName}. HTTP ${uploadResponse.status}`);
    }

    console.log(`Uploaded ${photoName}`);
  }

  const photosResponse = await apiFetch(apiBaseUrl, "/public/gallery-photos");
  if (!photosResponse.ok) {
    throw new Error(`Could not read gallery photos. HTTP ${photosResponse.status}`);
  }

  const body = await photosResponse.json() as { photoData?: unknown[] };
  console.log(`Bucket now contains ${body.photoData?.length ?? 0} photos.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
