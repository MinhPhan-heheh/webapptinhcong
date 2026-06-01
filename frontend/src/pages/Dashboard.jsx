import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = (message, type = "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/api/dashboard/");
        
        if (response.data.success) {
          setDashboardData(response.data.data);
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

    fetchDashboard();
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

  // Hàm lấy URL ảnh đại diện
  const getAvatarUrl = () => {
    const avatar = dashboardData?.user?.avatar;
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
                }}
              />
            ) : null}
            <div className="avatar-placeholder" style={{ display: getAvatarUrl() ? 'none' : 'flex' }}>
              {dashboardData?.user?.full_name?.charAt(0) || "U"}
            </div>
          </div>
          <div className="user-details">
            <h2>Xin chào, {dashboardData?.user?.full_name || "User"}!</h2>
            <p>{dashboardData?.user?.email}</p>
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