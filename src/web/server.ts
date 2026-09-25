import express from "express";
import path from "path";
import { app } from "./app";
import { db } from "../storage/database";

// Local dev only. On Vercel, public/ is served by the platform and the API
// runs via api/index.ts, so neither static serving nor listen() happens there.
const PORT = Number(process.env.PORT) || 4173;

app.use(express.static(path.join(process.cwd(), "public")));

app.listen(PORT, () => {
  console.log(`🌐 TechRadar dashboard running at http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
