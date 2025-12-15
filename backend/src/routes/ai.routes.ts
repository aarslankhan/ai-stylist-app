// src/routes/ai.routes.ts
import { Router } from "express";
import { firebaseAuth } from "../middleware/auth";
import {
  analyzeLookHandler,
  analyzeBodyProfileHandler,
  getStyleProfileHandler,
  deleteStyleProfileHandler,
  todaysOutfitHandler,
} from "../controllers/ai.controller";

const router = Router();

// All AI routes require auth
router.use(firebaseAuth);

// Outfit analysis for wardrobe / looks
router.post("/analyze-look", analyzeLookHandler);
// Backwards-compatible alias used by the mobile app:
router.post("/analyze-outfit", analyzeLookHandler);

// Find My Style – body profile + style blueprint
router.post("/analyze-body-profile", analyzeBodyProfileHandler);
router.get("/style-profile", getStyleProfileHandler);
router.delete("/style-profile", deleteStyleProfileHandler);

// Today’s outfit (occasion + wardrobe items)
router.post("/todays-outfit", todaysOutfitHandler);

export default router;
