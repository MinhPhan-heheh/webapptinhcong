import React, {
  useState,
} from "react";

// SỬA: thay axios bằng api
import api from "../../services/api";

import {
  useNavigate,
  Link,
} from "react-router-dom";

function Register() {

  const navigate =
    useNavigate();

  const [formData, setFormData] =
    useState({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });

    if (error) {
      setError("");
    }
  };

  const handleRegister =
    async (e) => {

      e.preventDefault();

      setError("");

      setSuccess("");

      if (
        !formData.fullName.trim()
      ) {
        return setError(
          "Vui lòng nhập họ tên"
        );
      }

      if (
        !formData.email.trim()
      ) {
        return setError(
          "Vui lòng nhập email"
        );
      }

      if (
        !formData.password
      ) {
        return setError(
          "Vui lòng nhập mật khẩu"
        );
      }

      if (
        formData.password.length <
        6
      ) {
        return setError(
          "Mật khẩu tối thiểu 6 ký tự"
        );
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        return setError(
          "Mật khẩu xác nhận không khớp"
        );
      }

      setLoading(true);

      try {

        // SỬA: xóa URL cứng, dùng api instance
       const res = await api.post("/auth/register", { fullName, email, phone, password });

        setSuccess(
          res.data.message ||
            "Đăng ký thành công"
        );

        setTimeout(() => {
          navigate("/");
        }, 1800);

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
            "Đăng ký thất bại"
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
            Tạo tài khoản nhân viên
          </p>

        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}

        <form
          onSubmit={handleRegister}
          style={styles.form}
        >

          <div style={styles.inputGroup}>

            <label style={styles.label}>
              Họ và tên
            </label>

            <input
              type="text"
              name="fullName"
              placeholder="Nhập họ tên"
              value={
                formData.fullName
              }
              onChange={
                handleChange
              }
              style={styles.input}
              required
            />

          </div>

          <div style={styles.inputGroup}>

            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              name="email"
              placeholder="Nhập email"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              style={styles.input}
              required
            />

          </div>

          <div style={styles.inputGroup}>

            <label style={styles.label}>
              Số điện thoại
            </label>

            <input
              type="text"
              name="phone"
              placeholder="Nhập số điện thoại"
              value={
                formData.phone
              }
              onChange={
                handleChange
              }
              style={styles.input}
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
                name="password"
                placeholder="Nhập mật khẩu"
                value={
                  formData.password
                }
                onChange={
                  handleChange
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

          <div style={styles.inputGroup}>

            <label style={styles.label}>
              Xác nhận mật khẩu
            </label>

            <div style={styles.passwordWrapper}>

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                value={
                  formData.confirmPassword
                }
                onChange={
                  handleChange
                }
                style={styles.input}
                required
              />

              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword
                  ? "🙈"
                  : "👁️"}
              </button>

            </div>

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
              ? "Đang xử lý..."
              : "Đăng ký"}
          </button>

        </form>

        <div style={styles.footer}>

          Đã có tài khoản?

          <Link
            to="/"
            style={styles.link}
          >
            Đăng nhập
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
    bottom: -100,
    left: -100,
  },

  card: {
    width: "100%",
    maxWidth: 450,
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
    marginBottom: 28,
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
    fontSize: 36,
    fontWeight: 800,
    color: "#1e293b",
  },

  subtitle: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 15,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
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
  },

  passwordWrapper: {
    position: "relative",
  },

  eyeBtn: {
    position: "absolute",
    top: "50%",
    right: 14,
    transform:
      "translateY(-50%)",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 20,
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
    fontWeight: 700,
    textDecoration: "none",
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

  success: {
    background: "#dcfce7",
    color: "#16a34a",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    textAlign: "center",
    fontSize: 14,
    fontWeight: 500,
  },
};

export default Register;