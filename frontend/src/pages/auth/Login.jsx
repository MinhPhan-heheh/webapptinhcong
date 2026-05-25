import React, {
  useState,
} from "react";

// SỬA: thay axios bằng api
import api from "../../services/api";

import {
  useNavigate,
  Link,
} from "react-router-dom";

function Login() {

  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleLogin =
    async (e) => {

      e.preventDefault();

      setError("");

      setLoading(true);

      try {

        // SỬA: xóa URL cứng, dùng api instance
        const res =
          await api.post(
            "/api/auth/login",
            {
              email,
              password,
            }
          );

        localStorage.setItem(
          "token",
          res.data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            res.data.user
          )
        );

        navigate("/dashboard");

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
            "Đăng nhập thất bại"
        );

      } finally {

        setLoading(false);
      }
    };

  return (

    <div style={styles.container}>

      <div style={styles.overlay}></div>

      <div style={styles.card}>

        <div style={styles.header}>

          <div style={styles.logo}>
            W
          </div>

          <h1 style={styles.title}>
            WORKSHIFT
          </h1>

          <p style={styles.subtitle}>
            Hệ thống quản lý nhân viên part-time
          </p>

        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={styles.form}
        >

          <div style={styles.inputGroup}>

            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              style={styles.input}
              required
            />

          </div>

          <div style={styles.inputGroup}>

            <label style={styles.label}>
              Mật khẩu
            </label>

            <div style={styles.passwordWrapper}>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                style={styles.input}
                required
              />

              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword
                  ? "🙈"
                  : "👁️"}
              </button>

            </div>

          </div>

          <div style={styles.forgotWrapper}>

            <Link
              to="/forgot-password"
              style={styles.forgotLink}
            >
              Quên mật khẩu?
            </Link>

          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity:
                loading ? 0.7 : 1,
            }}
            disabled={loading}
          >
            {loading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>

        </form>

        <div style={styles.footer}>

          Chưa có tài khoản?

          <Link
            to="/register"
            style={styles.link}
          >
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
    background:
      "linear-gradient(135deg,#141e30,#243b55)",
    display: "flex",
    justifyContent:
      "center",
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
    background:
      "rgba(255,255,255,0.05)",
    top: -100,
    right: -100,
  },

  card: {
    width: "100%",
    maxWidth: 430,
    background: "#fff",
    borderRadius: 28,
    padding: "40px 30px",
    boxShadow:
      "0 15px 40px rgba(0,0,0,0.25)",
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
    background:
      "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "white",
    display: "flex",
    justifyContent:
      "center",
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
    padding:
      "15px 50px 15px 16px",
    border:
      "1px solid #cbd5e1",
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
    transform:
      "translateY(-50%)",
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
    background:
      "linear-gradient(135deg,#2563eb,#1d4ed8)",
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