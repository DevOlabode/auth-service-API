const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const authRoutes = require("./routes/auth");
const User = require("./models/user");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ================================
   DATABASE (SERVERLESS SAFE)
================================ */

mongoose.set("bufferCommands", false);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/* ================================
   MIDDLEWARE
================================ */

app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use(passport.initialize());

/* ================================
   PASSPORT (STATELESS)
================================ */

passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate())
);

/* ================================
   ROUTES
================================ */

app.use("/", authRoutes);

app.get("/", (req, res) => {
  res.json({ msg: "Auth Service API running" });
});

/* ================================
   ERROR HANDLER
================================ */

app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

/* ================================
   EXPORT FOR VERCEL
================================ */

// ❌ DO NOT use app.listen on Vercel
module.exports = app;
