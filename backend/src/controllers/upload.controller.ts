// src/controllers/upload.controller.ts
import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import {
  uploadBufferToS3,
  getPresignedUploadUrl,
  getPublicS3UrlForKey,
} from "../config/s3";

export async function uploadBase64Image(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    // Support data URLs like: "data:image/jpeg;base64,AAAA..."
    let base64Data = imageBase64;
    let mimeType = "image/jpeg";

    const matches = /^data:(.+);base64,(.*)$/.exec(imageBase64);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, "base64");
    const extension = mimeType.split("/")[1] || "jpg";
    const key = `looks/${userId}/${Date.now()}.${extension}`;

    const url = await uploadBufferToS3({
      buffer,
      mimeType,
      key,
    });

    return res.status(201).json({ url });
  } catch (err) {
    console.error("uploadBase64Image error:", err);
    return res.status(500).json({ error: "Failed to upload image" });
  }
}

export async function getPresignedUploadUrlController(
  req: AuthedRequest,
  res: Response
) {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { mimeType } = req.body;

    if (!mimeType || typeof mimeType !== "string") {
      return res.status(400).json({ error: "mimeType is required" });
    }

    // Decide extension based on mime type
    let extension = "jpeg";
    if (mimeType === "image/png") extension = "png";
    else if (mimeType === "image/webp") extension = "webp";

    const key = `looks/${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const uploadUrl = await getPresignedUploadUrl({
      key,
      mimeType,
      expiresInSeconds: 60,
    });

    const fileUrl = getPublicS3UrlForKey(key);

    return res.status(201).json({ uploadUrl, fileUrl, key });
  } catch (err) {
    console.error("getPresignedUploadUrl error:", err);
    return res.status(500).json({ error: "Failed to create upload URL" });
  }
}
