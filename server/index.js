import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import documentRoutes from "./src/routes/documentRoutes.js";

import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();

// ==============================
// Connect MongoDB
// ==============================

connectDB();

// ==============================
// Middleware
// ==============================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==============================
// Health Check
// ==============================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Doc Manager API is running 🚀",
  });
});

// ==============================
// Routes
// ==============================

app.use("/api/auth", authRoutes);

app.use("/api/documents", documentRoutes);

// ==============================
// Error Middleware
// ==============================

app.use(notFound);

app.use(errorHandler);

// ==============================
// Server
// ==============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});