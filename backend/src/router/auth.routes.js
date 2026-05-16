const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  verifyToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controller/auth.controller");

const authMiddleware = require("../middleware/auth.middleware");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// Protected routes (cần xác thực)
router.get("/verify", authMiddleware, verifyToken);
router.get("/me", authMiddleware, getMe);

module.exports = router;