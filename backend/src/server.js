require("dotenv").config();
require("./db");

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./router/auth.routes");
const dashboardRoutes = require("./router/dashboard.routes");
const workPlacesRoutes = require("./router/work_places.routes");
const salaryRoutes = require("./router/salary.routes");
const profileRoutes = require("./router/profile.routes");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* ================= UPLOAD FOLDER ================= */

const publicDir = path.resolve(
  __dirname,
  "../public"
);

const uploadDir = path.join(
  publicDir,
  "uploads/avatars"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

/* ================= STATIC FILE ================= */

app.use(
  "/uploads",
  express.static(
    path.join(publicDir, "uploads")
  )
);

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/workplaces",
  workPlacesRoutes
);

app.use(
  "/api/salary",
  salaryRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

/* ================= HEALTH ================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server running",
  });
});

/* ================= ROOT ================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WorkShift API Server",
  });
});

/* ================= ERROR ================= */

app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message:
      err.message ||
      "Internal server error",
  });
});

/* ================= 404 ================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`,
  });
});

/* ================= START SERVER ================= */

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});