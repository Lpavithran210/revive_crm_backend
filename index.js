import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";

import "./followupReminderCron.js";
import userRoute from "./routes/userRoute.js";
import studentRoute from "./routes/studentRoute.js";
import courseRoute from "./routes/courseRoute.js";

import { initSocket } from "./socket/socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = initSocket(server);

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.set("view engine", "ejs");

// ✅ Routes
app.use("/api/user", userRoute);
app.use("/api/course", courseRoute);
app.use("/api", studentRoute);

// ✅ Health routes
app.get("/", (req, res) => {
  res.send("Revive CRM Backend Running");
});

app.get("/health", (req, res) => {
  res.status(200).send("Health check passed");
});

// ✅ DB + Server start
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log("DB connected and server running on port", process.env.PORT);
    });
  })
  .catch((e) => console.log("DB Error:", e.message));