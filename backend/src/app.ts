import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import runGraph from "./ai/graph.ai.js";
import authRouter from "./auth/auth.routes.js";
import { requireAuth } from "./auth/auth.middleware.js";
import type { AuthenticatedRequest } from "./auth/auth.middleware.js";

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or is a vercel preview/production domain
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      process.env.NODE_ENV !== "production"
    ) {
      return callback(null, true);
    }
    
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
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
