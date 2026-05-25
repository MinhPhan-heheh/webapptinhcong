import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/api/dashboard");
        
        if (response.data.success) {
          setDashboardData(response.data.data);
        }
      } catch (error) {
        console.error("Lỗi fetch dashboard:", error);
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

  // Hàm lấy URL ảnh đại diện - dùng trực tiếp từ API
  const getAvatarUrl = () => {
    const avatar = dashboardData?.user?.avatar;
    if (avatar) {
      // Nếu avatar đã là URL đầy đủ thì dùng luôn
      // Nếu là path tương đối thì axios instance sẽ tự xử lý
      return avatar;
    }
    return null;
  };

  if (loading) {
    return <div className="dashboard-loading">Đang tải...</div>;
  }

  return (
    <div className="dashboard-page">
      {/* Header với avatar - click vào avatar để vào profile */}
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

      {/* Thống kê - click vào từng card để chuyển trang */}
      <div className="stats-grid">
        {/* Card Ca làm - click vào shift */}
        <div className="stat-card" onClick={goToShifts} style={{ cursor: "pointer" }}>
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-value">{dashboardData?.stats?.totalShiftsThisWeek || 0}</div>
            <div className="stat-label">Ca làm tuần này</div>
          </div>
        </div>

        {/* Card Giờ làm - click vào attendance */}
        <div className="stat-card" onClick={goToAttendance} style={{ cursor: "pointer" }}>
          <div className="stat-icon">⏰</div>
          <div className="stat-info">
            <div className="stat-value">{dashboardData?.stats?.totalHoursThisWeek || 0}h</div>
            <div className="stat-label">Giờ làm tuần này</div>
          </div>
        </div>

        {/* Card Lương - click vào salary */}
        <div className="stat-card" onClick={goToSalary} style={{ cursor: "pointer" }}>
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-value">
              {(dashboardData?.stats?.estimatedSalary || 0).toLocaleString()}đ
            </div>
            <div className="stat-label">Lương tháng này</div>
          </div>
        </div>

        {/* Card Chỗ làm - click vào workplace-register */}
        <div className="stat-card" onClick={goToWorkplaces} style={{ cursor: "pointer" }}>
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <div className="stat-value">{dashboardData?.stats?.totalWorkplaces || 0}</div>
            <div className="stat-label">Chỗ làm</div>
          </div>
        </div>
      </div>

      {/* Ca làm sắp tới - click vào từng ca để vào shift */}
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
                  <div className="holiday-badge">🎉 Ngày lễ</div>
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