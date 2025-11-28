// src/controllers/upload.controller.ts
import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { uploadBufferToS3 } from "../config/s3";

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
