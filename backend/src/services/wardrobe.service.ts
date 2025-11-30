// backend/src/services/wardrobe.service.ts
import { Look, ILook } from "../models/Look";
import { s3 } from "../config/s3";
import { ENV } from "../config/env";

// Create
export async function createLook(input: {
  userId: string;
  clientId: string;
  imageUrl: string;
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
}): Promise<ILook> {
  const look = await Look.create({
    userId: input.userId,
    clientId: input.clientId,
    imageUrl: input.imageUrl,
    score: input.score,
    vibe: input.vibe,
    tags: input.tags,
    notes: input.notes,
  });

  return look;
}

// 🔹 List all looks for a user
export async function listLooks(userId: string): Promise<ILook[]> {
  return Look.find({ userId }).sort({ createdAt: -1 }).exec();
}

// Helper: get S3 key from full URL
function getS3KeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
  } catch {
    return null;
  }
}

// Delete by clientId (string)
export async function deleteLookById(
  userId: string,
  clientId: string
): Promise<void> {
  const look = await Look.findOne({ userId, clientId }).exec();

  if (!look) {
    console.log("deleteLookById: look not found", { userId, clientId });
    return;
  }

  const imageUrl = look.imageUrl;

  // 1) Delete from S3
  if (imageUrl && ENV.S3_BUCKET_NAME) {
    const key = getS3KeyFromUrl(imageUrl);
    if (key) {
      try {
        await s3
          .deleteObject({
            Bucket: ENV.S3_BUCKET_NAME,
            Key: key,
          })
          .promise();
        console.log("🧹 S3 object deleted:", key);
      } catch (err) {
        console.error("⚠️ Failed to delete S3 object", { clientId, key, err });
      }
    } else {
      console.warn("⚠️ Could not derive S3 key from URL:", imageUrl);
    }
  }

  // 2) Delete from Mongo
  await Look.deleteOne({ userId, clientId }).exec();
  console.log("✅ Mongo look deleted", { userId, clientId });
}
