import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = {
  GOOGLE_API_KEY:  process.env.GOOGLE_GEMINI_AI_BATTLE_ARENA_API_KEY || "",
  COHERE_API_KEY:  process.env.COHERE_AI_BATTLE_ARENA_API_KEY || "",
  MISTRAL_API_KEY: process.env.MISTRAL_AI_BATTLE_ARENA_API_KEY || "",
  TAVILY_API_KEY:  process.env.TAVILY_API_KEY || "",

  // Auth
  JWT_SECRET:             process.env.JWT_SECRET || "aequitas-super-secret-dev-key-change-in-prod",
  JWT_REFRESH_SECRET:     process.env.JWT_REFRESH_SECRET || "aequitas-refresh-secret-dev-key-change-in-prod",
  ACCESS_TOKEN_EXPIRY:    "15m",   // Short-lived — verified on every API call
  REFRESH_TOKEN_EXPIRY:   "7d",    // Long-lived — stored in DB + httpOnly cookie

  // Database
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/aequitas",
};

export default config;
