// src/server.ts
import app from "./app";
import { connectDB } from "./config/db";
import { ENV } from "./config/env";
import { getActiveAiProvider } from "./services/aiProvider";

async function start() {
  await connectDB();

  const provider = getActiveAiProvider();
  console.log(
    `🤖 Using AI provider: ${provider.toUpperCase()} (AI_PROVIDER in .env)`
  );

  app.listen(ENV.PORT, () => {
    console.log(`✅ Server running on http://localhost:${ENV.PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
