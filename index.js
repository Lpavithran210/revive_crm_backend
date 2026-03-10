import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import './followupReminderCron.js'
import userRoute from './routes/userRoute.js'
import studentRoute from './routes/studentRoute.js'
import courseRoute from './routes/courseRoute.js'

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

export { io };

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.set("view engine", "ejs");

mongoose.connect(process.env.MONGODB_URI).then(() => {

    server.listen(process.env.PORT, () =>
        console.log("DB connected and listening to port", process.env.PORT)
    );

}).catch(e => console.log("Error while connecting to DB", e.message));

app.use('/api/user', userRoute)
app.use('/api/course', courseRoute)
app.use('/api', studentRoute)