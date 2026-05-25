import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("========== LOGIN ATTEMPT ==========");
      console.log("📤 Endpoint: /api/auth/login");
      console.log("📧 Email:", email);
      
      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      console.log("========== RESPONSE RECEIVED ==========");
      console.log("📥 Full response object:", res);
      console.log("📦 res.data:", res.data);
      console.log("🔍 JSON stringify:", JSON.stringify(res.data, null, 2));
      console.log("🔑 All keys in res.data:", Object.keys(res.data));
      console.log("=======================================");

      // THỬ LẤY TOKEN THEO NHIỀU CÁCH
      const token = res.data.token || res.data.accessToken || res.data.data?.token || res.data.data?.accessToken;
      const user = res.data.user || res.data.data?.user;

      console.log("🎯 Token found:", token);
      console.log("👤 User found:", user);

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        console.log("✅ Token saved to localStorage");
        console.log("✅ Verify token:", localStorage.getItem("token"));
        console.log("✅ Verify user:", localStorage.getItem("user"));
        console.log("========== LOGIN SUCCESS ==========");
        navigate("/dashboard");
      } else {
        console.error("❌ NO TOKEN FOUND!");
        console.error("❌ Response structure:", res.data);
        setError("Đăng nhập thất bại: Không nhận được token từ server");
      }
    } catch (err) {
      console.error("========== LOGIN ERROR ==========");
      console.error("❌ Error object:", err);
      console.error("❌ Error response:", err.response);
      console.error("❌ Error data:", err.response?.data);
      console.error("❌ Error message:", err.response?.data?.message);
      console.error("=================================");
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>W</div>
          <h1 style={styles.title}>WORKSHIFT</h1>
          <p style={styles.subtitle}>Hệ thống quản lý nhân viên part-time</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mật khẩu</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div style={styles.forgotWrapper}>
            <Link to="/forgot-password" style={styles.forgotLink}>
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div style={styles.footer}>
          Chưa có tài khoản?
          <Link to="/register" style={styles.link}>
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#141e30,#243b55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    top: -100,
    right: -100,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    background: "#fff",
    borderRadius: 28,
    padding: "40px 30px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
    position: "relative",
    zIndex: 2,
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 32,
    fontWeight: 700,
    margin: "0 auto 18px",
  },
  title: {
    margin: 0,
    color: "#1e293b",
    fontSize: 36,
    fontWeight: 800,
  },
  subtitle: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 15,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: 8,
    color: "#334155",
    fontWeight: 600,
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: "15px 50px 15px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    transition: "0.3s",
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    top: "50%",
    right: 15,
    transform: "translateY(-50%)",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 20,
  },
  forgotWrapper: {
    textAlign: "right",
    marginTop: -10,
  },
  forgotLink: {
    color: "#2563eb",
    fontSize: 14,
    textDecoration: "none",
    fontWeight: 600,
  },
  button: {
    border: "none",
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "white",
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 5,
  },
  footer: {
    marginTop: 25,
    textAlign: "center",
    color: "#64748b",
    display: "flex",
    justifyContent: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 700,
  },
  error: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    textAlign: "center",
    fontSize: 14,
    fontWeight: 500,
  },
};

export default Login;