import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatCohere } from "@langchain/cohere";
import config from "../config/config.js";

export const geminiAiModel = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    apiKey: config.GOOGLE_API_KEY,
});

export const mistralAiModel = new ChatMistralAI({
    model: "mistral-medium",
    apiKey: config.MISTRAL_API_KEY,
});

export const cohereAiModel = new ChatCohere({
    model: "command-a-03-2025", 
    apiKey: config.COHERE_API_KEY
});
