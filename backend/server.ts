import app from "./src/app.js";
import { connectDB } from "./src/db/connect.js";

const PORT = process.env.PORT || 3000;

// Connect to MongoDB first, then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});