import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);


// 🛠 Allow CORS for API & WebSocket connections
app.use(cors({
    origin: "*",  // Replace "*" with your frontend URL if needed
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// 🔹 Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});

// 🔹 WebSocket Server Setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("⚡ Client connected");

    socket.on("sendEmails", async ({ emails, subject }) => {
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < emails.length; i++) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL,
                    to: emails[i].email,
                    subject,
                    html: emails[i].content,
                });
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to send email to ${emails[i]}`, error);
                failedCount++;
            }

            // 🔹 Send real-time progress update
            socket.emit("progress", { sent: successCount, failed: failedCount, total: emails.length });
        }

        // 🔹 Notify completion
        socket.emit("completed", { success: successCount, failed: failedCount });
    });

    socket.on("disconnect", () => {
        console.log("🔴 Client disconnected");
    });
});

// Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
