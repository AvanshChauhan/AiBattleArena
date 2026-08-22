import mongoose from "mongoose";
import config from "../config/config.js";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("✅ MongoDB connected:", mongoose.connection.host);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1); // Fatal — can't run without DB
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected. Reconnecting…");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err);
  });
}
