require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const cors = require("cors");
const helmet = require("helmet");

const { getDb } = require("./models/db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const sectionsRoutes = require("./routes/sections");
const clientsRoutes = require("./routes/clients");
const assignmentsRoutes = require("./routes/assignments");
const exportRoutes = require("./routes/export");
const notificationsRoutes = require("./routes/notifications");
const routingRoutes = require("./routes/routing");

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE_MS) || 1800000;

// Initialize DB on startup
// Initialize DB on startup and auto-seed if empty
const db = getDb();
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get();
if (userCount.c === 0) {
  console.log("Database is empty — auto-seeding...");
  require("./utils/seed");
  console.log("Auto-seed complete.");
}

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Session with MemoryStore (works in dev; swap to connect-pg-simple or similar for prod)
app.use(
  session({
    store: new MemoryStore({ checkPeriod: SESSION_MAX_AGE }),
    secret:
      process.env.SESSION_SECRET || "mecon_ams_super_secret_change_in_prod",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
    },
    name: "ams_sid",
  }),
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sections", sectionsRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/routing", routingRoutes);

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ error: "Internal server error." });
});

const path = require("path");
const frontendBuild = path.join(__dirname, "..", "..", "frontend", "build");
app.use(express.static(frontendBuild));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendBuild, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 MECON AMS Backend running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Database    : ${process.env.DB_PATH || "./data/ams.db"}`);
  console.log(`   Run "npm run seed" first if the DB is fresh\n`);
});
