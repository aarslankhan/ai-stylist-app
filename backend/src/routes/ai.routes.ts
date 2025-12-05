// src/routes/ai.routes.ts
import { Router } from "express";
import { analyzeOutfitHandler } from "../controllers/ai.controller";

const router = Router();

// If you add auth middleware later, plug it here.
// e.g. router.post("/analyze-outfit", requireAuth, analyzeOutfitHandler);
router.post("/analyze-outfit", analyzeOutfitHandler);

export default router;
