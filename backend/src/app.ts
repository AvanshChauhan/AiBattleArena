import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import runGraph from "./ai/graph.ai.js";
import authRouter from "./auth/auth.routes.js";
import { requireAuth } from "./auth/auth.middleware.js";
import type { AuthenticatedRequest } from "./auth/auth.middleware.js";

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:4173"],
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Required for cookies to be sent cross-origin
}));
app.use(express.json());
app.use(cookieParser()); // Parse httpOnly cookies (refresh token)

// ─── Auth routes (public) ─────────────────────────────────────────────────────
app.use("/auth", authRouter);

// ─── Health check (public) ────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "AI Battle Arena API is running", endpoint: "POST /api/compare" });
});

// ─── Protected routes ─────────────────────────────────────────────────────────
app.post("/api/compare", requireAuth, async (req: AuthenticatedRequest, res) => {
  const problem = typeof req.body?.problem === "string" ? req.body.problem.trim() : "";

  if (!problem) {
    res.status(400).json({ error: "Please provide a non-empty 'problem' string in the request body." });
    return;
  }

  // Basic length guard — very long prompts can exhaust API token limits
  if (problem.length > 2000) {
    res.status(400).json({ error: "Problem statement is too long (max 2000 characters)." });
    return;
  }

  try {
    const result = await runGraph(problem);
    res.json(result);
  } catch (err) {
    console.error("Failed to run battle:", err);
    res.status(500).json({ error: "Something went wrong while running the battle. Please check the API keys and try again." });
  }
});

export default app;
