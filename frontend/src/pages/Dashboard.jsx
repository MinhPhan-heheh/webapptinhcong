import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Dashboard.css";

// Constants
const REFRESH_INTERVAL = 30000; // 30 seconds

// Stat Card Component - memoized
const StatCard = memo(({ icon, label, value, onClick }) => (
  <div className="stat-card" onClick={onClick} style={{ cursor: "pointer" }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
));

// Upcoming Shift Item Component - memoized
const UpcomingShiftItem = memo(({ shift, onClick }) => (
  <div className="upcoming-item" onClick={onClick} style={{ cursor: "pointer" }}>
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
));

// Month Stat Card Component - memoized
const MonthStatCard = memo(({ label, value, onClick, isSalary = false }) => (
  <div className="month-stat-card" onClick={onClick} style={{ cursor: "pointer" }}>
    <div className={`month-stat-value ${isSalary ? "salary" : ""}`}>
      {value}
    </div>
    <div className="month-stat-label">{label}</div>
  </div>
));

// Toast Component
const Toast = memo(({ show, message, type }) => {
  if (!show) return null;
  return (
    <div className={`toast-notification ${type}`}>
      {message}
    </div>
  );
});

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = useCallback((message, type = "error") => {
    setToast({ show: true, message, type });
    const timer = setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Get user from localStorage - memoized
  const getUserFromStorage = useCallback(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error("Lỗi đọc user từ localStorage:", e);
    }
    return null;
  }, []);

  // Get avatar URL - memoized
  const getAvatarUrl = useCallback(() => {
    const avatar = dashboardData?.user?.avatar || getUserFromStorage()?.avatar;
    if (!avatar) return null;
    
    if (avatar.startsWith("http")) return avatar;
    if (avatar.startsWith("/uploads")) {
      return `https://workshift-o5sm.onrender.com${avatar}`;
    }
    return avatar;
  }, [dashboardData?.user?.avatar, getUserFromStorage]);

  // Get user name - memoized
  const getUserName = useCallback(() => {
    return dashboardData?.user?.full_name || getUserFromStorage()?.full_name || "User";
  }, [dashboardData?.user?.full_name, getUserFromStorage]);

  // Get user email - memoized
  const getUserEmail = useCallback(() => {
    return dashboardData?.user?.email || getUserFromStorage()?.email || "";
  }, [dashboardData?.user?.email, getUserFromStorage]);

  // Update user in localStorage with fresh data
  const updateUserInStorage = useCallback((userData) => {
    if (!userData) return;
    
    const currentUser = getUserFromStorage();
    const updatedUser = {
      ...currentUser,
      ...userData,
      avatar: userData.avatar || currentUser?.avatar
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }, [getUserFromStorage]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async (isRefresh = false) => {
    const controller = new AbortController();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await api.get("/api/dashboard/", {
        signal: controller.signal
      });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        
        // Update user in localStorage with fresh avatar
        if (response.data.data?.user) {
          updateUserInStorage(response.data.data.user);
        }
      }
    } catch (error) {
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        console.error("Lỗi fetch dashboard:", error);
        if (error.response?.status === 401) {
          showToast("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", "error");
          // Clear invalid session
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setTimeout(() => navigate("/"), 2000);
        } else {
          showToast("Không thể tải dữ liệu dashboard", "error");
        }
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
    
    return () => controller.abort();
  }, [navigate, showToast, updateUserInStorage]);

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchDashboard(true);
      }
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchDashboard, loading, refreshing]);

  // Handle avatar error
  const handleAvatarError = useCallback((e) => {
    e.target.style.display = 'none';
    const nextSibling = e.target.nextSibling;
    if (nextSibling) {
      nextSibling.style.display = 'flex';
    }
    
    // Clear invalid avatar from localStorage
    const user = getUserFromStorage();
    if (user?.avatar) {
      user.avatar = null;
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [getUserFromStorage]);

  // Navigation handlers - memoized
  const navigationHandlers = useMemo(() => ({
    shifts: () => navigate("/shift"),
    attendance: () => navigate("/attendance"),
    salary: () => navigate("/salary"),
    workplaces: () => navigate("/workplace-register"),
    profile: () => navigate("/profile")
  }), [navigate]);

  // Memoized values
  const avatarUrl = useMemo(() => getAvatarUrl(), [getAvatarUrl]);
  const userName = useMemo(() => getUserName(), [getUserName]);
  const userEmail = useMemo(() => getUserEmail(), [getUserEmail]);
  const userInitial = useMemo(() => userName.charAt(0).toUpperCase(), [userName]);
  
  const stats = useMemo(() => ({
    totalShiftsThisWeek: dashboardData?.stats?.totalShiftsThisWeek || 0,
    totalHoursThisWeek: dashboardData?.stats?.totalHoursThisWeek || 0,
    estimatedSalary: (dashboardData?.stats?.estimatedSalary || 0).toLocaleString(),
    totalWorkplaces: dashboardData?.stats?.totalWorkplaces || 0,
    totalShiftsThisMonth: dashboardData?.stats?.totalShiftsThisMonth || 0,
    totalHoursThisMonth: dashboardData?.stats?.totalHoursThisMonth || 0
  }), [dashboardData]);

  const upcomingShifts = useMemo(() => 
    dashboardData?.stats?.upcomingShifts || [], 
    [dashboardData?.stats?.upcomingShifts]
  );

  const currentDate = useMemo(() => {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getFullYear()}`;
  }, []);

  if (loading) {
    return <div className="dashboard-loading">⏳ Đang tải dữ liệu...</div>;
  }

  return (
    <div className="dashboard-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {/* Header with avatar */}
      <div className="dashboard-header" onClick={navigationHandlers.profile} style={{ cursor: "pointer" }}>
        <div className="user-info">
          <div className="user-avatar">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="avatar-img"
                onError={handleAvatarError}
              />
            ) : null}
            <div className="avatar-placeholder" style={{ display: avatarUrl ? 'none' : 'flex' }}>
              {userInitial}
            </div>
          </div>
          <div className="user-details">
            <h2>Xin chào, {userName}!</h2>
            <p>{userEmail}</p>
          </div>
        </div>
        {refreshing && <div className="refreshing-indicator">🔄</div>}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard 
          icon="📅" 
          label="Ca làm tuần này" 
          value={stats.totalShiftsThisWeek} 
          onClick={navigationHandlers.shifts}
        />
        <StatCard 
          icon="⏰" 
          label="Giờ làm tuần này" 
          value={`${stats.totalHoursThisWeek}h`} 
          onClick={navigationHandlers.attendance}
        />
        <StatCard 
          icon="💰" 
          label="Lương tháng này" 
          value={`${stats.estimatedSalary}đ`} 
          onClick={navigationHandlers.salary}
        />
        <StatCard 
          icon="🏢" 
          label="Chỗ làm" 
          value={stats.totalWorkplaces} 
          onClick={navigationHandlers.workplaces}
        />
      </div>

      {/* Upcoming Shifts Section */}
      <div className="upcoming-section">
        <div className="section-header">
          <h3>📋 Ca làm sắp tới</h3>
          <button className="view-all-btn" onClick={navigationHandlers.shifts}>Xem tất cả →</button>
        </div>
        {upcomingShifts.length > 0 ? (
          <div className="upcoming-list">
            {upcomingShifts.map((shift) => (
              <UpcomingShiftItem 
                key={shift.id} 
                shift={shift} 
                onClick={navigationHandlers.shifts}
              />
            ))}
          </div>
        ) : (
          <div className="empty-data" onClick={navigationHandlers.shifts} style={{ cursor: "pointer" }}>
            📭 Chưa có ca làm sắp tới. Bấm để đăng ký ca mới
          </div>
        )}
      </div>

      {/* Monthly Statistics Section */}
      <div className="month-stats">
        <div className="section-header">
          <h3>📊 Thống kê tháng {currentDate}</h3>
          <button className="view-all-btn" onClick={navigationHandlers.salary}>Xem chi tiết →</button>
        </div>
        <div className="month-stats-grid">
          <MonthStatCard 
            label="Tổng ca" 
            value={stats.totalShiftsThisMonth} 
            onClick={navigationHandlers.shifts}
          />
          <MonthStatCard 
            label="Tổng giờ" 
            value={`${stats.totalHoursThisMonth}h`} 
            onClick={navigationHandlers.attendance}
          />
          <MonthStatCard 
            label="Tổng lương" 
            value={`${stats.estimatedSalary}đ`} 
            onClick={navigationHandlers.salary}
            isSalary={true}
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;