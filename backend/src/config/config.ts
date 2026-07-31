import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = {
  GOOGLE_API_KEY: process.env.GOOGLE_GEMINI_AI_BATTLE_ARENA_API_KEY || "",
  COHERE_API_KEY: process.env.COHERE_AI_BATTLE_ARENA_API_KEY || "",
  MISTRAL_API_KEY: process.env.MISTRAL_AI_BATTLE_ARENA_API_KEY || "",
};

export default config;
