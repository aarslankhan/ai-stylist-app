// src/server.ts
import app from "./app";
import { connectDB } from "./config/db";
import { ENV } from "./config/env";

async function start() {
  await connectDB();

  app.listen(ENV.PORT, () => {
    console.log(`✅ Server running on http://localhost:${ENV.PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
