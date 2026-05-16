const pool = require("../db");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// ================= LẤY THÔNG TIN HỒ SƠ =================
const getProfile = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT 
        id,
        full_name,
        email,
        phone,
        avatar,
        is_verified,
        created_at
      FROM users 
      WHERE id = $1`,
      [user_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
};

// ================= CẬP NHẬT THÔNG TIN HỒ SƠ =================
const updateProfile = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { full_name, phone } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (full_name) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu cập nhật"
      });
    }

    values.push(user_id);
    const query = `
      UPDATE users 
      SET ${updates.join(", ")} 
      WHERE id = $${paramIndex}
      RETURNING id, full_name, email, phone, avatar, is_verified
    `;

    const result = await pool.query(query, values);

    return res.json({
      success: true,
      message: "Cập nhật hồ sơ thành công",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
};

// ================= CẬP NHẬT MẬT KHẨU =================
const updatePassword = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới"
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự"
      });
    }

    const userResult = await pool.query(
      `SELECT password FROM users WHERE id = $1`,
      [user_id]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng"
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [hashedPassword, user_id]
    );

    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công"
    });
  } catch (error) {
    console.error("Update Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
};

// ================= CẬP NHẬT ẢNH ĐẠI DIỆN =================
const updateAvatar = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh"
      });
    }

    // Lấy avatar cũ để xóa
    const oldAvatar = await pool.query(
      `SELECT avatar FROM users WHERE id = $1`,
      [user_id]
    );

    if (oldAvatar.rows[0]?.avatar) {
      const oldPath = path.join(__dirname, "../../public", oldAvatar.rows[0].avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Tạo đường dẫn ảnh
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Cập nhật avatar trong database
    const result = await pool.query(
      `UPDATE users SET avatar = $1 WHERE id = $2
       RETURNING id, full_name, email, phone, avatar, is_verified`,
      [avatarUrl, user_id]
    );

    return res.json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      user: result.rows[0],
      avatarUrl: `http://localhost:${process.env.PORT || 5000}${avatarUrl}`
    });
  } catch (error) {
    console.error("Update Avatar Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
};

// ================= XÓA ẢNH ĐẠI DIỆN =================
const removeAvatar = async (req, res) => {
  try {
    const user_id = req.user.id;

    const userResult = await pool.query(
      `SELECT avatar FROM users WHERE id = $1`,
      [user_id]
    );

    if (userResult.rows[0]?.avatar) {
      const oldAvatarPath = path.join(__dirname, "../../public", userResult.rows[0].avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const result = await pool.query(
      `UPDATE users SET avatar = NULL WHERE id = $1
       RETURNING id, full_name, email, phone, avatar, is_verified`,
      [user_id]
    );

    return res.json({
      success: true,
      message: "Xóa ảnh đại diện thành công",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Remove Avatar Error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  updateAvatar,
  removeAvatar
};