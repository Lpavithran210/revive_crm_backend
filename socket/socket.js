import notificationModel from "../models/notificationModel.js";

let io;
const onlineUsers = new Map(); // userId -> Set of socketIds

export const initSocket = async (server) => {
  io = new (await import("socket.io")).Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("registerUser", async (userId) => {
      const roomId = userId.toString();

      socket.join(roomId);

      // ✅ MULTI SOCKET SUPPORT
      if (!onlineUsers.has(roomId)) {
        onlineUsers.set(roomId, new Set());
      }

      onlineUsers.get(roomId).add(socket.id);

      console.log("ONLINE USERS MAP:", onlineUsers);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      for (let [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);

          // remove user if no sockets left
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            console.log(`User ${userId} removed`);
          }

          break;
        }
      }

      console.log("ONLINE USERS AFTER DISCONNECT:", onlineUsers);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};

export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};