const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const authRoutes = require("./routes/auth");
const User = require("./models/user");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ================================
   DATABASE CONNECTION 
================================ */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined");
}

mongoose.set("bufferCommands", false);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  cached.conn = await cached.promise;
  console.log("MongoDB connected");
  return cached.conn;
}

/* ================================
   MIDDLEWARE
================================ */

app.use(express.json());

const sessionConfig = {
  name: "auth-service-session",
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

/* ================================
   PASSPORT CONFIG
================================ */

passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate())
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* ================================
   ROUTES
================================ */

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/", authRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ msg: "Auth Service API is running" });
});

/* ================================
   ERROR HANDLER
================================ */

app.use((err, req, res, next) => {
  console.error(err);
  const { statusCode = 500, message = "Internal Server Error" } = err;
  res.status(statusCode).json({ error: message });
});

/* ================================
   SERVER
================================ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
