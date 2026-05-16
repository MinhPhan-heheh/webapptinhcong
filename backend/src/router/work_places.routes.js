const express = require("express");
const router = express.Router();

// Import Controllers - Theo đúng tên file của bạn
const {
  registerWorkplace,
  getMyWorkplaces,
  updateWorkplace,
  deleteWorkplace,
} = require("../controller/work_place.controller");

const {
  createShift,
  getMyShifts,
  updateShift,
  deleteShift,
  getShiftDetail,
} = require("../controller/shifts.controller");

const authMiddleware = require("../middleware/auth.middleware");

// ==================== WORKPLACES ====================
router.post(
  "/register",
  authMiddleware,
  registerWorkplace
);

router.get(
  "/my",
  authMiddleware,
  getMyWorkplaces
);

router.put(
  "/:workplace_id",
  authMiddleware,
  updateWorkplace
);

router.delete(
  "/:workplace_id",
  authMiddleware,
  deleteWorkplace
);
// ==================== SHIFTS ====================
// tạo ca làm
router.post(
  "/shifts/create",
  authMiddleware,
  createShift
);

// danh sách ca làm
router.get(
  "/shifts/my",
  authMiddleware,
  getMyShifts
);

// chi tiết ca làm
router.get(
  "/shifts/:id",
  authMiddleware,
  getShiftDetail
);

// cập nhật ca làm
router.put(
  "/shifts/:id",
  authMiddleware,
  updateShift
);

// xóa ca làm
router.delete(
  "/shifts/:id",
  authMiddleware,
  deleteShift
);

module.exports = router;