// src/routes/upload.routes.ts
import { Router } from "express";
import { firebaseAuth } from "../middleware/auth";
import { uploadBase64Image } from "../controllers/upload.controller";

const router = Router();

router.use(firebaseAuth);

router.post("/", uploadBase64Image);

export default router;
