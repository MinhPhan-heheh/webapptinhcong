const pool = require("../db");

/* ================= ĐĂNG KÝ CHỖ LÀM ================= */

const registerWorkplace = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {
      name,
      address,
      hourly_rate = 25000,
      salary_per_hour,
      has_break = false,
      break_minutes = 0,
      overtime_rate = 1.5,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: "Tên và địa chỉ là bắt buộc",
      });
    }

    const rate = Number(hourly_rate);

    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({
        success: false,
        message: "Lương theo giờ phải lớn hơn 0",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO workplaces (
        name,
        address,
        hourly_rate,
        user_id,
        salary_per_hour,
        has_break,
        break_minutes,
        overtime_rate,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
      RETURNING *
      `,
      [
        name.trim(),
        address.trim(),
        rate,
        userId,
        salary_per_hour
          ? Number(salary_per_hour)
          : null,
        has_break,
        Number(break_minutes) || 0,
        Number(overtime_rate) || 1.5,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký chỗ làm thành công",
      workplace: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Register Workplace Error:",
      error
    );

    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Chỗ làm đã tồn tại",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= LẤY DANH SÁCH CHỖ LÀM ================= */

const getMyWorkplaces = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        address,
        hourly_rate,
        salary_per_hour,
        has_break,
        break_minutes,
        overtime_rate,
        is_active,
        created_at
      FROM workplaces
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [user_id]
    );

    return res.json({
      success: true,
      workplaces: result.rows,
    });
  } catch (error) {
    console.error(
      "Get My Workplaces Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= CHI TIẾT CHỖ LÀM ================= */

const getWorkplaceDetail = async (
  req,
  res
) => {
  try {
    const user_id = req.user.id;

    const { workplace_id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM workplaces
      WHERE id = $1
      AND user_id = $2
      `,
      [workplace_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chỗ làm",
      });
    }

    return res.json({
      success: true,
      workplace: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get Workplace Detail Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= CẬP NHẬT CHỖ LÀM ================= */

const updateWorkplace = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { workplace_id } = req.params;

    const {
      name,
      address,
      hourly_rate,
      salary_per_hour,
      has_break,
      break_minutes,
      overtime_rate,
      is_active,
    } = req.body;

    const check = await pool.query(
      `
      SELECT id
      FROM workplaces
      WHERE id = $1
      AND user_id = $2
      `,
      [workplace_id, user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Chỗ làm không tồn tại hoặc bạn không có quyền",
      });
    }

    const result = await pool.query(
      `
      UPDATE workplaces
      SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        hourly_rate = COALESCE($3, hourly_rate),
        salary_per_hour = COALESCE($4, salary_per_hour),
        has_break = COALESCE($5, has_break),
        break_minutes = COALESCE($6, break_minutes),
        overtime_rate = COALESCE($7, overtime_rate),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9
      AND user_id = $10
      RETURNING *
      `,
      [
        name,
        address,
        hourly_rate,
        salary_per_hour,
        has_break,
        break_minutes,
        overtime_rate,
        is_active,
        workplace_id,
        user_id,
      ]
    );

    return res.json({
      success: true,
      message: "Cập nhật thành công",
      workplace: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update Workplace Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= XÓA CHỖ LÀM ================= */

const deleteWorkplace = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { workplace_id } = req.params;

    const check = await pool.query(
      `
      SELECT id
      FROM workplaces
      WHERE id = $1
      AND user_id = $2
      `,
      [workplace_id, user_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Chỗ làm không tồn tại hoặc không có quyền",
      });
    }

    // xóa salary_details trước
    await pool.query(
      `
      DELETE FROM salary_details
      WHERE workplace_id = $1
      `,
      [workplace_id]
    );

    // xóa shifts
    await pool.query(
      `
      DELETE FROM shifts
      WHERE workplace_id = $1
      `,
      [workplace_id]
    );

    // xóa workplace
    await pool.query(
      `
      DELETE FROM workplaces
      WHERE id = $1
      `,
      [workplace_id]
    );

    return res.json({
      success: true,
      message: "Xóa chỗ làm thành công",
    });
  } catch (error) {
    console.error(
      "Delete Workplace Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  registerWorkplace,
  getMyWorkplaces,
  getWorkplaceDetail,
  updateWorkplace,
  deleteWorkplace,
};