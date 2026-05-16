const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middleware/auth.middleware");
const {
  getProfile,
  updateProfile,
  updatePassword,
  updateAvatar,
  removeAvatar
} = require("../controller/profile.controller");

// Cấu hình upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../public/uploads/avatars");
    if (!require("fs").existsSync(dir)) {
      require("fs").mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// Lấy thông tin hồ sơ
router.get("/", authMiddleware, getProfile);

// Cập nhật thông tin
router.put("/", authMiddleware, updateProfile);

// Đổi mật khẩu
router.put("/password", authMiddleware, updatePassword);

// Cập nhật ảnh đại diện
router.post("/avatar", authMiddleware, upload.single("avatar"), updateAvatar);

// Xóa ảnh đại diện
router.delete("/avatar", authMiddleware, removeAvatar);

module.exports = router;