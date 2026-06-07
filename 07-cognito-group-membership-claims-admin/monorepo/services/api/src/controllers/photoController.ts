import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { GetPhotosResponse, PhotoData } from "../types";

const s3Client = new S3Client();

function getBucketName(res: Response): string | null {
  const bucketName = process.env.IMAGES_BUCKET_NAME;

  if (!bucketName) {
    res.status(500).json({ error: "IMAGES_BUCKET_NAME is not configured" });
    return null;
  }

  return bucketName;
}

function removeTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export async function getPresignedUrl(_req: Request, res: Response) {
  try {
    const bucketName = getBucketName(res);
    if (!bucketName) return;

    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: randomUUID(),
        ContentType: "image/jpeg",
      }),
      { expiresIn: 900 },
    );

    res.type("text/plain").send(uploadUrl);
  } catch {
    res.status(500).json({ error: "Could not create upload URL" });
  }
}

export async function getPhotos(_req: Request, res: Response) {
  const bucketName = process.env.IMAGES_BUCKET_NAME;
  const cloudfrontUrl = process.env.IMAGES_CLOUDFRONT_URL;

  if (!bucketName || !cloudfrontUrl) {
    res.status(500).json({ error: "Photo service is not configured." });
    return;
  }

  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucketName }),
    );

    const photoData: PhotoData[] = [];

    for (const s3File of response.Contents ?? []) {
      if (!s3File.Key) continue;

      const cloudfrontBase = removeTrailingSlash(cloudfrontUrl);
      const encodedKey = encodeURIComponent(s3File.Key);
      const url = `${cloudfrontBase}/${encodedKey}`;

      photoData.push({
        id: s3File.Key,
        title: s3File.Key,
        description: "",
        small: url,
        large: url,
      });
    }

    const body: GetPhotosResponse = { photoData };
    res.json(body);
  } catch {
    res.status(500).json({ error: "Could not list photos." });
  }
}

export async function deletePhotos(_req: Request, res: Response) {
  try {
    const bucketName = getBucketName(res);
    if (!bucketName) return;

    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        }),
      );

      const photosToDelete: { Key: string }[] = [];

      for (const s3File of response.Contents ?? []) {
        if (!s3File.Key) continue;
        photosToDelete.push({ Key: s3File.Key });
      }

      if (photosToDelete.length > 0) {
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: photosToDelete },
          }),
        );
      }

      deleted += photosToDelete.length;
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    res.json({ deleted });
  } catch {
    res.status(500).json({ error: "Could not delete photos" });
  }
}
