import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [userAvatar, setUserAvatar] = useState(null);

  const showToast = (message, type = "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Hàm lấy avatar từ localStorage hoặc API
  const getAvatarFromStorage = useCallback(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.avatar) {
          return user.avatar;
        }
      }
    } catch (e) {
      console.error("Lỗi đọc user từ localStorage:", e);
    }
    return null;
  }, []);

  // Hàm lấy URL ảnh đại diện
  const getAvatarUrl = useCallback(() => {
    // Ưu tiên avatar từ dashboardData (mới nhất)
    let avatar = dashboardData?.user?.avatar;
    
    // Nếu không có, lấy từ localStorage
    if (!avatar) {
      avatar = getAvatarFromStorage();
    }
    
    if (avatar) {
      if (avatar.startsWith("http")) {
        return avatar;
      }
      if (avatar.startsWith("/uploads")) {
        return `https://workshift-o5sm.onrender.com${avatar}`;
      }
      return avatar;
    }
    return null;
  }, [dashboardData?.user?.avatar, getAvatarFromStorage]);

  // Lắng nghe sự kiện thay đổi avatar từ Profile
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        const newAvatar = getAvatarFromStorage();
        setUserAvatar(newAvatar);
        // Cập nhật lại dashboard để lấy avatar mới
        fetchDashboard();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [getAvatarFromStorage]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/dashboard/");
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        
        // Cập nhật user trong localStorage với avatar mới từ API
        if (response.data.data?.user) {
          const currentUserStr = localStorage.getItem("user");
          if (currentUserStr) {
            const currentUser = JSON.parse(currentUserStr);
            const updatedUser = {
              ...currentUser,
              avatar: response.data.data.user.avatar || currentUser.avatar
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
        }
      }
    } catch (error) {
      console.error("Lỗi fetch dashboard:", error);
      if (error.response?.status === 401) {
        showToast("❌ Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", "error");
      } else {
        showToast("❌ Không thể tải dữ liệu dashboard", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    
    // Set interval để cập nhật dashboard mỗi 30 giây (tùy chọn)
    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Hàm điều hướng
  const goToShifts = () => {
    navigate("/shift");
  };

  const goToAttendance = () => {
    navigate("/attendance");
  };

  const goToSalary = () => {
    navigate("/salary");
  };

  const goToWorkplaces = () => {
    navigate("/workplace-register");
  };

  const goToProfile = () => {
    navigate("/profile");
  };

  if (loading) {
    return <div className="dashboard-loading">⏳ Đang tải dữ liệu...</div>;
  }

  return (
    <div className="dashboard-page">
      {/* Toast thông báo */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header với avatar */}
      <div className="dashboard-header" onClick={goToProfile} style={{ cursor: "pointer" }}>
        <div className="user-info">
          <div className="user-avatar">
            {getAvatarUrl() ? (
              <img 
                src={getAvatarUrl()} 
                alt="Avatar" 
                className="avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                  // Xóa avatar khỏi localStorage nếu ảnh lỗi
                  const userStr = localStorage.getItem("user");
                  if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user.avatar) {
                      user.avatar = null;
                      localStorage.setItem("user", JSON.stringify(user));
                    }
                  }
                }}
              />
            ) : null}
            <div className="avatar-placeholder" style={{ display: getAvatarUrl() ? 'none' : 'flex' }}>
              {dashboardData?.user?.full_name?.charAt(0) || 
               (() => {
                 const userStr = localStorage.getItem("user");
                 if (userStr) {
                   try {
                     const user = JSON.parse(userStr);
                     return user.full_name?.charAt(0) || "U";
                   } catch (e) {
                     return "U";
                   }
                 }
                 return "U";
               })()}
            </div>
          </div>
          <div className="user-details">
            <h2>Xin chào, {dashboardData?.user?.full_name || 
              (() => {
                const userStr = localStorage.getItem("user");
                if (userStr) {
                  try {
                    const user = JSON.parse(userStr);
                    return user.full_name || "User";
                  } catch (e) {
                    return "User";
                  }
                }
                return "User";
              })()}!</h2>
            <p>{dashboardData?.user?.email || 
              (() => {
                const userStr = localStorage.getItem("user");
                if (userStr) {
                  try {
                    const user = JSON.parse(userStr);
                    return user.email || "";
                  } catch (e) {
                    return "";
                  }
                }
                return "";
              })()}</p>
          </div>
        </div>
      </div>

      {/* Thống kê */}
      <div className="stats-grid">
        <div className="stat-card" onClick={goToShifts} style={{ cursor: "pointer" }}>
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-value">{dashboardData?.stats?.totalShiftsThisWeek || 0}</div>
            <div className="stat-label">Ca làm tuần này</div>
          </div>
        </div>

        <div className="stat-card" onClick={goToAttendance} style={{ cursor: "pointer" }}>
          <div className="stat-icon">⏰</div>
          <div className="stat-info">
            <div className="stat-value">{dashboardData?.stats?.totalHoursThisWeek || 0}h</div>
            <div className="stat-label">Giờ làm tuần này</div>
          </div>
        </div>

        <div className="stat-card" onClick={goToSalary} style={{ cursor: "pointer" }}>
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-value">
              {(dashboardData?.stats?.estimatedSalary || 0).toLocaleString()}đ
            </div>
            <div className="stat-label">Lương tháng này</div>
          </div>
        </div>

        <div className="stat-card" onClick={goToWorkplaces} style={{ cursor: "pointer" }}>
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <div className="stat-value">{dashboardData?.stats?.totalWorkplaces || 0}</div>
            <div className="stat-label">Chỗ làm</div>
          </div>
        </div>
      </div>

      {/* Ca làm sắp tới */}
      <div className="upcoming-section">
        <div className="section-header">
          <h3>📋 Ca làm sắp tới</h3>
          <button className="view-all-btn" onClick={goToShifts}>Xem tất cả →</button>
        </div>
        {dashboardData?.stats?.upcomingShifts?.length > 0 ? (
          <div className="upcoming-list">
            {dashboardData.stats.upcomingShifts.map((shift) => (
              <div 
                key={shift.id} 
                className="upcoming-item"
                onClick={() => navigate("/shift")}
                style={{ cursor: "pointer" }}
              >
                <div className="upcoming-date">
                  {new Date(shift.shift_date).toLocaleDateString("vi-VN")}
                </div>
                <div className="upcoming-time">
                  {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                </div>
                <div className="upcoming-place">{shift.workplace_name}</div>
                {shift.holiday_type === 'holiday' && (
                  <div className="holiday-badge">🎉 Ngày lễ (x2)</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-data" onClick={goToShifts} style={{ cursor: "pointer" }}>
            📭 Chưa có ca làm sắp tới. Bấm để đăng ký ca mới
          </div>
        )}
      </div>

      {/* Thống kê nhanh tháng */}
      <div className="month-stats">
        <div className="section-header">
          <h3>📊 Thống kê tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</h3>
          <button className="view-all-btn" onClick={goToSalary}>Xem chi tiết →</button>
        </div>
        <div className="month-stats-grid">
          <div className="month-stat-card" onClick={goToShifts} style={{ cursor: "pointer" }}>
            <div className="month-stat-value">{dashboardData?.stats?.totalShiftsThisMonth || 0}</div>
            <div className="month-stat-label">Tổng ca</div>
          </div>
          <div className="month-stat-card" onClick={goToAttendance} style={{ cursor: "pointer" }}>
            <div className="month-stat-value">{dashboardData?.stats?.totalHoursThisMonth || 0}h</div>
            <div className="month-stat-label">Tổng giờ</div>
          </div>
          <div className="month-stat-card" onClick={goToSalary} style={{ cursor: "pointer" }}>
            <div className="month-stat-value salary">
              {(dashboardData?.stats?.estimatedSalary || 0).toLocaleString()}đ
            </div>
            <div className="month-stat-label">Tổng lương</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;