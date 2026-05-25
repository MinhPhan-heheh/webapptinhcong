import React, { useState } from "react";
// SỬA: thay axios bằng api
import api from "../../services/api";
import { useNavigate, Link } from "react-router-dom";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // SỬA: xóa URL cứng, dùng api instance
      await api.post("/api/auth/forgot-password", {
        email,
      });

      setSuccess("Mã OTP đã được gửi đến email của bạn!");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể gửi OTP!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // SỬA: xóa URL cứng, dùng api instance
      await api.post("/api/auth/verify-otp", {
        email,
        otp,
      });

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "OTP không đúng!");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);

    try {
      // SỬA: xóa URL cứng, dùng api instance
      await api.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });

      setSuccess("Đổi mật khẩu thành công!");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Đổi mật khẩu thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>WORKSHIFT</h1>
        <p style={styles.subtitle}>Khôi phục mật khẩu</p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi OTP"}
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <label style={styles.label}>Mã OTP</label>
            <input
              type="text"
              placeholder="Nhập OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={styles.input}
              maxLength={6}
              required
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Đang xác thực..." : "Xác nhận OTP"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={styles.backButton}
            >
              Quay lại
            </button>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <label style={styles.label}>Mật khẩu mới</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              required
            />

            <label style={styles.label}>Xác nhận mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </form>
        )}

        <p style={styles.footer}>
          <Link to="/" style={styles.link}>
            Quay về đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "#fff",
    padding: "40px 30px",
    borderRadius: "20px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
    textAlign: "center",
  },

  title: {
    fontSize: "34px",
    fontWeight: "bold",
    color: "#243b55",
    marginBottom: "5px",
  },

  subtitle: {
    color: "#666",
    marginBottom: "20px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  label: {
    alignSelf: "flex-start",
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },

  input: {
    width: "92%",
    padding: "14px 16px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    fontSize: "16px",
    outline: "none",
    margin: "0 auto",
    display: "block",
  },

  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#243b55",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },

  backButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#eee",
    color: "#333",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  },

  footer: {
    marginTop: "20px",
  },

  link: {
    color: "#243b55",
    fontWeight: "bold",
    textDecoration: "none",
  },

  error: {
    backgroundColor: "#ffe6e6",
    color: "#d32f2f",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "10px",
  },

  success: {
    backgroundColor: "#e6f7e6",
    color: "#2e8b57",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "10px",
  },
};

export default ForgotPassword;