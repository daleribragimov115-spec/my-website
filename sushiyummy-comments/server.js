require('dotenv').config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000", 
    "http://127.0.0.1:3001",
    "https://sushiyummy.onrender.com",
    "https://sushiyummy.uz",
    "https://sushi-yummy-backend.onrender.com"
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "docs")));

// ✅ TO'G'RI MongoDB Connection String
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://daleribragimov115_db_user:wIOuUwU4qjfrPn9C@cluster0.8kppsgw.mongodb.net/comments_db?retryWrites=true&w=majority";

console.log("🔗 MongoDB URI mavjudligi:", MONGODB_URI ? "Ha" : "Yo'q");

// ✅ YANGILANGAN: MongoDB ulanishi - yangi driver uchun
const connectDB = async () => {
  try {
    console.log("🔄 MongoDB ga ulanmoqda...");
    
    // ✅ YANGI: Yangi MongoDB driver sozlamalari
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // ❌ ESKI: bufferMaxEntries: 0 - BU OPTION O'CHIRILDI
      // ✅ YANGI: Buffer sozlamalari
      bufferCommands: false, // Buffer ni o'chirish
      maxPoolSize: 10, // Connection pool hajmi
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true
    });
    
    console.log('✅ MongoDB ga muvaffaqiyatli ulandik');
  } catch (error) {
    console.error('❌ MongoDB ulanish xatosi:', error.message);
    // 10 soniyadan keyin qayta urinish
    setTimeout(connectDB, 10000);
  }
};

// MongoDB events
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Dastlabki ulanish
connectDB();

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

// Database connection tekshirish
const ensureConnection = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log('🔄 MongoDB ulanmagan, qayta ulanmoqda...');
    await connectDB();
    // Biroz kutish
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

// 📊 API Routes

// Barcha aktiv kommentlarni olish
app.get("/api/comments", async (req, res) => {
  try {
    await ensureConnection();
    
    const comments = await Comment.find({ status: "active" })
      .select("-phone -__v")
      .sort({ timestamp: -1 })
      .maxTimeMS(30000)
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
      error: "Server xatosi: " + error.message,
    });
  }
});

// 📝 Yangi komment qo'shish
app.post("/api/comments", async (req, res) => {
  console.log("📨 Yangi komment so'rovi keldi");

  try {
    await ensureConnection();

    const { name, phone, rating, comment, subscribed = true } = req.body;

    // Validatsiya
    if (!name || !phone || !rating || !comment) {
      return res.status(400).json({
        success: false,
        error: "Barcha maydonlarni to'ldiring",
      });
    }

    const cleanPhone = phone.replace(/\s/g, "");
    const phoneRegex = /^\+?[0-9]{10,13}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: "Iltimos, to'g'ri telefon raqamini kiriting",
      });
    }

    if (comment.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Kommentariya kamida 10 ta belgidan iborat bo'lishi kerak",
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

    // Timeout bilan saqlash
    const savedComment = await Promise.race([
      newComment.save(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout after 20s')), 20000)
      )
    ]);

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
      message: "Kommentariya muvaffaqiyatli qo'shildi",
      comment: responseComment,
    });

  } catch (error) {
    console.error("❌ Komment qo'shish xatosi:", error);

    if (error.message === 'Database timeout after 20s') {
      return res.status(504).json({
        success: false,
        error: "Server javob bermadi. Iltimos, qaytadan urinib ko'ring.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Server xatosi: " + error.message,
    });
  }
});

// Health check
app.get("/api/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  
  let dbPing = false;
  if (dbStatus === "connected") {
    try {
      await mongoose.connection.db.admin().ping();
      dbPing = true;
    } catch (error) {
      dbPing = false;
    }
  }

  res.json({
    success: true,
    message: "Server ishlayapti",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      ping: dbPing,
      readyState: mongoose.connection.readyState
    }
  });
});

// Frontend uchun
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "docs", "index.html"));
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint topilmadi",
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🔥 Global error handler:", error);
  res.status(500).json({
    success: false,
    error: "Ichki server xatosi",
  });
});

// 🚀 Serverni ishga tushirish
app.listen(PORT, '0.0.0.0', () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 Sushi Yummy Server ishga tushdi!");
  console.log("=".repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 URL: https://sushi-yummy-backend.onrender.com`);
  console.log(`🗄️ MongoDB: ${mongoose.connection.readyState === 1 ? "Ulangan" : "Ulanmagan"}`);
  console.log("=".repeat(50));
});