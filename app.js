const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

require('dotenv').config()
const indexRouter = require("./routes/index");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

// ================= SOCKET.IO CHAT =================
const userHistories = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  userHistories.set(socket.id, []);

  socket.on("chatMessage", async (message) => {
    console.log("User:", message);
    const history = userHistories.get(socket.id) || [];
    history.push({ role: "user", content: message });

    try {
    const response = await axios.post(
      "http://localhost:11434/api/chat",
      {
        model: "qwen2.5:0.5b",
        stream: true,
        messages: history,
      },
      {
        headers: { "Content-Type": "application/json" },
        responseType: "stream", // bắt buộc để axios trả về stream
      }
    );

    let botReply = "";

    response.data.on("data", (chunk) => {
      const text = chunk.toString();
      const lines = text.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            socket.emit("botMessage", data.message.content);
            botReply += data.message.content;
          }
        } catch (err) {
          console.error("Parse error:", err);
        }
      }
    });

    response.data.on("end", () => {
      history.push({ role: "assistant", content: botReply });
      userHistories.set(socket.id, history);
      socket.emit("botEnd");
    });

    response.data.on("error", (err) => {
      console.error("Stream error:", err);
      socket.emit("botMessage", "Lỗi khi đọc stream!");
      socket.emit("botEnd");
    });
  } catch (error) {
    console.error("Error fetching AI model:", error);
    socket.emit("botMessage", "Lỗi gọi modessl AI!");
    socket.emit("botEnd");
  }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    userHistories.delete(socket.id);
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

// Thay đổi dòng này - export app thay vì server
module.exports = { app, server };