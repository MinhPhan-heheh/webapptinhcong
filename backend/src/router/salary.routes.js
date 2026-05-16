const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const salaryController = require("../controller/salary.controller");

// Tính lương theo tháng
router.get("/calculate", authMiddleware, salaryController.calculateSalary);

// Lấy lương theo từng chỗ làm
router.get("/by-workplace", authMiddleware, salaryController.getSalaryByWorkplace);

// Lấy lương theo tuần (API mới)
router.get("/by-week", authMiddleware, salaryController.getSalaryByWeek);

// Lấy lịch sử lương
router.get("/history", authMiddleware, salaryController.getSalaryHistory);

// Xóa bản ghi lương
router.delete("/history/:id", authMiddleware, salaryController.deleteSalaryRecord);

module.exports = router;