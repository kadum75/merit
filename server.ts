import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env.local (overrides .env) — keeps secrets off disk in shared envs
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
// Fallback to .env for backward compatibility
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const { app, isSupabaseConfigured, isStripeConfigured } = createApp();
  const PORT = parseInt(process.env.API_PORT || "3001");

  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`Supabase: ${isSupabaseConfigured ? "configured" : "NOT configured (stub mode)"}`);
    console.log(`Stripe: ${isStripeConfigured ? "configured" : "NOT configured"}`);
  });
}

startServer();
