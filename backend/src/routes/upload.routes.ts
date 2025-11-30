// src/routes/upload.routes.ts
import { Router } from "express";
import { firebaseAuth } from "../middleware/auth";
import {
  uploadBase64Image,
  getPresignedUploadUrlController,
} from "../controllers/upload.controller";

const router = Router();

router.use(firebaseAuth);

// old base64 endpoint (still available if needed)
router.post("/", uploadBase64Image);

// new: get S3 presigned URL
router.post("/presign", getPresignedUploadUrlController);

export default router;
