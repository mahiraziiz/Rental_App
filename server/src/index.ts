import dotenv from "dotenv";
import path from "path";

// Load environment variables FIRST, before any other imports
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

import app from "./server";
import prisma from "./db/index";

const PORT = Number(process.env.PORT) || 3002;

// Test database connection
prisma
  .$connect()
  .then(() => {
    console.log("Database connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.log("Database connection failed:", err.message);
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
