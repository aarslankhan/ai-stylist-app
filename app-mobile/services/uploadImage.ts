import { Platform } from "react-native";
import { auth } from "./firebase";
import { API_BASE_URL } from "../config/api";

type UploadImageParams = {
  base64?: string | null; // for WEB (can be raw base64 or data URL)
  uri?: string | null;    // for NATIVE (file:// URI)
  mimeType?: string | null;
  token?: string | null;  // optional – reuse Firebase token if you already have it
};

/**
 * Shared S3 upload helper.
 *
 * - WEB:
 *    POST /upload-image  with { imageBase64, mimeType }
 *    returns url/fileUrl/imageUrl
 *
 * - NATIVE:
 *    POST /upload-image/presign → { uploadUrl, fileUrl }
 *    PUT  to presigned uploadUrl with the image blob
 */
export const uploadImageToS3 = async ({
  base64,
  uri,
  mimeType,
  token,
}: UploadImageParams): Promise<string | null> => {
  try {
    let authToken = token;

    if (!authToken) {
      const currentUser = auth.currentUser;
      authToken = currentUser ? await currentUser.getIdToken() : null;
    }

    const finalMimeType = mimeType || "image/jpeg";

    // ───────────── WEB: base64 → /upload-image ─────────────
    if (Platform.OS === "web") {
      if (!base64) {
        console.log("uploadImageToS3 (web): missing base64.");
        return null;
      }

      console.log("▶ WEB upload via /upload-image (shared helper)");

      const res = await fetch(`${API_BASE_URL}/upload-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: base64, // can be raw base64 or data URL, unchanged
          mimeType: finalMimeType,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.log("❌ uploadImageToS3 web failed:", res.status, txt);
        return null;
      }

      const json = await res.json();
      const url: string | undefined =
        json.url || json.fileUrl || json.imageUrl;

      if (!url) {
        console.log("uploadImageToS3 (web): no URL returned", json);
        return null;
      }

      console.log("✅ uploadImageToS3 (web) got URL:", url);
      return url;
    }

    // ───────────── NATIVE: presign + PUT(uri) ─────────────
    if (!uri) {
      console.log("uploadImageToS3 (native): missing uri.");
      return null;
    }

    console.log("▶ NATIVE upload: requesting presigned URL (shared helper)…");

    const presignRes = await fetch(`${API_BASE_URL}/upload-image/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        mimeType: finalMimeType,
      }),
    });

    if (!presignRes.ok) {
      const txt = await presignRes.text().catch(() => "");
      console.log(
        "❌ uploadImageToS3 native: failed to get presigned URL:",
        presignRes.status,
        txt
      );
      return null;
    }

    const presignJson = await presignRes.json();
    const uploadUrl: string | undefined = presignJson.uploadUrl;
    const fileUrl: string | undefined = presignJson.fileUrl;

    if (!uploadUrl || !fileUrl) {
      console.log(
        "uploadImageToS3 native: response missing uploadUrl/fileUrl",
        presignJson
      );
      return null;
    }

    console.log("✅ uploadImageToS3 native: got presigned URLs", {
      uploadUrl: String(uploadUrl).slice(0, 80) + "...",
      fileUrl,
    });

    const fileResponse = await fetch(uri);
    const blob = await (fileResponse as any).blob();

    console.log("uploadImageToS3 native: blob size", blob.size);

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": finalMimeType,
      },
      body: blob,
    });

    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => "");
      console.log(
        "❌ uploadImageToS3 native: PUT to S3 failed:",
        putRes.status,
        txt
      );
      return null;
    }

    console.log("✅ uploadImageToS3 native: PUT to S3 OK →", fileUrl);
    return fileUrl ?? null;
  } catch (err) {
    console.log("❌ uploadImageToS3 generic error:", err);
    return null;
  }
};
