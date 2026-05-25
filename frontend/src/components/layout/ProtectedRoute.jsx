import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        logout();
        return;
      }

      try {
        // Giải mã token để kiểm tra thời gian hết hạn
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Date.now() / 1000;

        if (payload.exp < now) {
          console.log("Token expired at:", new Date(payload.exp * 1000));
          alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
          logout();
          return;
        }

        // Kiểm tra token với backend (nếu có API verify)
        try {
          const response = await axios.get("/api/auth/verify", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            setIsAuth(true);
            // Lưu thông tin user nếu cần
            if (response.data.user) {
              localStorage.setItem("user", JSON.stringify(response.data.user));
            }
          } else {
            logout();
            return;
          }
        } catch (error) {
          // Nếu không có API verify, vẫn cho phép nếu token hợp lệ về mặt thời gian
          console.warn("Backend verify API not available, trusting token by expiration only");
          setIsAuth(true);
        }

        setLoading(false);

        // Tự động đăng xuất khi token hết hạn
        const timeLeft = (payload.exp - now) * 1000;
        if (timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000) { // Chỉ đặt timer nếu còn dưới 24h
          const timer = setTimeout(() => {
            console.log("Token expired, logging out...");
            alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
            logout();
          }, timeLeft);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("Token verification error:", err);
        logout();
      }
    };

    verifyToken();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuth(false);
    setLoading(false);
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="protected-loading-container">
        <div className="protected-loading-spinner"></div>
        <div className="protected-loading-text">Đang kiểm tra đăng nhập...</div>
      </div>
    );
  }

  return isAuth ? <Outlet /> : <Navigate to="/" replace />;
}

export default ProtectedRoute;