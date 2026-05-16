const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ================= REGISTER =================
const register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin",
      });
    }

    const checkEmail = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (checkEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, is_verified, created_at`,
      [fullName, email, phone || null, hashedPassword]
    );

    // Tạo token
    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      token,
      user: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại",
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Sai mật khẩu",
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// ================= GET ME (Lấy thông tin user hiện tại) =================
const getMe = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const result = await pool.query(
      `SELECT id, full_name, email, phone, avatar, is_verified, created_at
       FROM users WHERE id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// ================= VERIFY TOKEN =================
const verifyToken = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const result = await pool.query(
      `SELECT id, full_name, email, phone, avatar, is_verified, created_at
       FROM users WHERE id = $1`,
      [user_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }
    
    return res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// ================= SEND EMAIL =================
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"WorkShift" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Không thể gửi email");
  }
};

// ================= FORGOT PASSWORD =================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `UPDATE users SET otp = $1, otp_expired_at = $2 WHERE email = $3`,
      [otp, expires, email]
    );

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">🔐 Khôi phục mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP dưới đây:</p>
        <div style="text-align: center; margin: 20px 0;">
          <div style="display: inline-block; background: #f0f0f0; padding: 15px 30px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">
            ${otp}
          </div>
        </div>
        <p>Mã OTP có hiệu lực trong <strong>10 phút</strong>.</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    await sendEmail(email, "OTP Reset Password - WorkShift", html);

    res.json({
      success: true,
      message: "Đã gửi OTP đến email của bạn",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// ================= VERIFY OTP =================
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND otp = $2 AND otp_expired_at > NOW()`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
      });
    }

    res.json({
      success: true,
      message: "OTP hợp lệ",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// ================= RESET PASSWORD =================
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const check = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND otp = $2 AND otp_expired_at > NOW()`,
      [email, otp]
    );

    if (check.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc hết hạn",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users SET password = $1, otp = NULL, otp_expired_at = NULL WHERE email = $2`,
      [hashedPassword, email]
    );

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
};