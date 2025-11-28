// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import wardrobeRoutes from "./routes/wardrobe.routes";
import uploadRoutes from "./routes/upload.routes"; // ⬅️ add this

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/upload-image", uploadRoutes);   // ⬅️ new
app.use("/api/wardrobe", wardrobeRoutes);

export default app;
