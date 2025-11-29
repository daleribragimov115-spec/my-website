require('dotenv').config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS ni Render uchun sozlash
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://sushiyummy.onrender.com",
      "https://sushiyummy.uz", 
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Atlas ulanishi
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://daleribragimov115_db_user:wIOuUwU4qjfrPn9C@cluster0.8kppsgw.mongodb.net/comments_db";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB Atlas ga muvaffaqiyatli ulandik");
  })
  .catch((err) => {
    console.error("❌ MongoDB ulanish xatosi:", err);
  });

// Comment schemasi
const commentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: "active",
  },
  subscribed: {
    type: Boolean,
    default: true,
  },
});

const Comment = mongoose.model("Comment", commentSchema, "comments");

// 📊 API Routes

// Barcha aktiv kommentlarni olish
app.get("/api/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ status: "active" })
      .select("-phone -__v")
      .sort({ timestamp: -1 })
      .lean();

    res.json({
      success: true,
      comments: comments,
      total: comments.length,
    });
  } catch (error) {
    console.error("❌ Kommentlarni olish xatosi:", error);
    res.status(500).json({
      success: false,
      error: "Server xatosi",
    });
  }
});

// 📝 Yangi komment qo'shish - SODDA VERSIYA
app.post("/api/comments", async (req, res) => {
  console.log("📨 Yangi komment so'rovi keldi:", req.body);

  try {
    const { name, phone, rating, comment, subscribed = true } = req.body;

    // Oddiy validatsiya
    if (!name || !phone || !rating || !comment) {
      console.log("❌ Validatsiya xatosi: Barcha maydonlar to'ldirilmagan");
      return res.status(400).json({
        success: false,
        error: "Заполните все поля.",
      });
    }

    // Telefon raqamini tekshirish
    const cleanPhone = phone.replace(/\s/g, "");
    const phoneRegex = /^\+?[0-9]{10,13}$/;
    if (!phoneRegex.test(cleanPhone)) {
      console.log("❌ Telefon raqami xatosi:", cleanPhone);
      return res.status(400).json({
        success: false,
        error: "Пожалуйста, введите правильный номер телефона.",
      });
    }

    if (comment.length < 10) {
      console.log("❌ Komment uzunligi xatosi:", comment.length);
      return res.status(400).json({
        success: false,
        error: "Комментарий должен содержать как минимум 10 символов.",
      });
    }

    // Yangi komment yaratish
    const newComment = new Comment({
      name: name.trim(),
      phone: cleanPhone,
      rating: parseInt(rating),
      comment: comment.trim(),
      subscribed: subscribed,
    });

    // Saqlash
    const savedComment = await newComment.save();

    // Telefon raqamisiz javob
    const responseComment = {
      _id: savedComment._id,
      name: savedComment.name,
      rating: savedComment.rating,
      comment: savedComment.comment,
      timestamp: savedComment.timestamp,
      status: savedComment.status,
      subscribed: savedComment.subscribed,
    };

    console.log("✅ Komment saqlandi:", responseComment._id);

    res.status(201).json({
      success: true,
      message: "Комментарий успешно добавлен.",
      comment: responseComment,
    });
  } catch (error) {
    console.error("❌ Komment qo'shish xatosi:", error);

    // MongoDB validatsiya xatolari
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: errors.join(", "),
      });
    }

    // Boshqa xatolar
    res.status(500).json({
      success: false,
      error: "Ошибка сервера: " + error.message,
    });
  }
});

// 🔧 Admin uchun barcha kommentlarni olish
app.get("/api/admin/comments", async (req, res) => {
  try {
    const comments = await Comment.find()
      .select("-__v")
      .sort({ timestamp: -1 })
      .lean();

    res.json({
      success: true,
      comments: comments,
      total: comments.length,
    });
  } catch (error) {
    console.error("❌ Admin kommentlarni olish xatosi:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сервера",
    });
  }
});

// Server holatini tekshirish
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server работает",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Frontend uchun
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint не найден",
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🔥 Global error handler:", error);
  res.status(500).json({
    success: false,
    error: "Внутренняя ошибка сервера",
  });
});

// 🚀 Serverni ishga tushirish
app.listen(PORT, '0.0.0.0', () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 Sushi Yummy Server ishga tushdi!");
  console.log("=".repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🌍 External: http://0.0.0.0:${PORT}`); // BU QATOR TO'G'RI
  console.log(`🗄️ MongoDB: ${mongoose.connection.readyState === 1 ? "Ulangan" : "Ulanmagan"}`);
  console.log("=".repeat(50));
});
