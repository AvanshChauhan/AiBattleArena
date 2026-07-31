import express from "express";
import cors from "cors";
import runGraph from "./ai/graph.ai.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "AI Battle Arena API is running", endpoint: "POST /api/compare" });
});

app.post("/api/compare", async (req, res) => {
  const problem = typeof req.body?.problem === "string" ? req.body.problem.trim() : "";

  if (!problem) {
    res.status(400).json({ error: "Please provide a non-empty 'problem' string in the request body." });
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
