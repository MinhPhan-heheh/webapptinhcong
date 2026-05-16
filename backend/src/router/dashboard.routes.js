const express = require("express");
const router = express.Router();

// Import Controller
const { getDashboardData } = require("../controller/dashboard");

// Import Middleware (phù hợp với cách bạn export)
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", authMiddleware, getDashboardData);

module.exports = router;