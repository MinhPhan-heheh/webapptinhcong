import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import api from "../services/api";
import "../styles/Attendance.css";

// Constants
const WEEK_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

// Format date helper
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Get current date string
const getTodayStr = () => formatDate(new Date());

// Shift Card Component - memoized để tránh re-render không cần thiết
const ShiftCard = memo(({ shift, isSelected, onClick }) => (
  <div 
    className={`shift-card ${shift.holiday_type === 'holiday' ? 'holiday' : ''} ${isSelected ? "selected" : ""}`}
    onClick={onClick}
  >
    <div className="shift-time">
      {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
    </div>
    <div className="shift-location">📍 {shift.workplace_name || shift.location}</div>
    {shift.holiday_type === 'holiday' && <div className="holiday-badge">🎉 Ngày lễ (x2)</div>}
  </div>
));

// Day Card Component - memoized
const DayCard = memo(({ day, shifts, selectedShiftId, onShiftClick, todayStr }) => {
  const dateStr = formatDate(day);
  const isToday = dateStr === todayStr;
  const dayShifts = shifts.filter(shift => {
    const shiftDate = shift.shift_date?.split("T")[0];
    return shiftDate === dateStr;
  });
  const hasShifts = dayShifts.length > 0;

  return (
    <div className={`day-card ${isToday ? "today-card" : ""} ${hasShifts ? "has-shifts" : ""}`}>
      <div className="card-header">
        <span className="day-name">{WEEK_NAMES[day.getDay()]}</span>
        <h2 className="day-number">{day.getDate()}</h2>
        <span className="month-name">{day.getMonth() + 1}/{day.getFullYear()}</span>
        {hasShifts && <span className="shift-count">{dayShifts.length}</span>}
      </div>
      <div className="shifts-list">
        {dayShifts.length > 0 ? (
          dayShifts.map((shift) => (
            <ShiftCard 
              key={shift.id} 
              shift={shift} 
              isSelected={selectedShiftId === shift.id}
              onClick={() => onShiftClick(shift, day)}
            />
          ))
        ) : (
          <div className="empty-box">📭 Không có ca</div>
        )}
      </div>
    </div>
  );
});

// Detail Panel Component
const DetailPanel = memo(({ shift, day, onClose }) => {
  if (!shift || !day) return null;
  
  return (
    <div className="shift-detail-panel">
      <button className="close-detail" onClick={onClose}>✕</button>
      <div className="detail-content">
        <div className="detail-date">
          📅 {day.getDate()}/{day.getMonth() + 1}/{day.getFullYear()}
        </div>
        <div className="detail-workplace">🏢 {shift.workplace_name || shift.location}</div>
        <div className="detail-time">⏰ {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}</div>
        {shift.holiday_type === 'holiday' && <div className="detail-holiday">🎉 Ngày lễ (x2 lương)</div>}
        <div className="detail-address">📍 {shift.workplace_address || "Chưa có địa chỉ"}</div>
      </div>
    </div>
  );
});

function Attendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    // Lưu view mode vào localStorage
    return localStorage.getItem("attendance_view_mode") || "week";
  });
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = useCallback((message, type = "error") => {
    const icon = type === "success" ? "✅ " : "❌ ";
    setToast({ show: true, message: icon + message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  }, []);

  // Save view mode when changed
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem("attendance_view_mode", mode);
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  const goToCurrent = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  // Fetch shifts with abort controller
  const fetchShifts = useCallback(async (isRefresh = false) => {
    const controller = new AbortController();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Vui lòng đăng nhập lại", "error");
        return;
      }

      const response = await api.get("/api/workplaces/shifts/my", {
        signal: controller.signal
      });
      
      if (response.data.success) {
        setShifts(response.data.shifts || []);
      } else {
        showToast(response.data.message || "Không thể tải lịch làm việc", "error");
      }
    } catch (error) {
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        console.error("Lỗi fetch shifts:", error);
        if (error.response?.status === 401) {
          showToast("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", "error");
        } else {
          showToast("Không thể tải lịch làm việc", "error");
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
  }, [showToast]);

  // Initial load
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Auto refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchShifts(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchShifts]);

  // Get week dates based on current date - memoized
  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(current.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, [currentDate]);

  // Get month days - memoized
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  // Create shifts map for quick lookup - memoized
  const shiftsByDate = useMemo(() => {
    const map = new Map();
    shifts.forEach(shift => {
      const dateKey = shift.shift_date?.split("T")[0];
      if (dateKey) {
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey).push(shift);
      }
    });
    return map;
  }, [shifts]);

  // Get shifts for a specific date using the map
  const getShiftsByDate = useCallback((dateStr) => {
    return shiftsByDate.get(dateStr) || [];
  }, [shiftsByDate]);

  // Handle shift click
  const handleShiftClick = useCallback((shift, day) => {
    if (selectedShift?.id === shift.id) {
      setSelectedShift(null);
      setSelectedDay(null);
    } else {
      setSelectedShift(shift);
      setSelectedDay(day);
    }
  }, [selectedShift]);

  // Close detail panel
  const closeDetail = useCallback(() => {
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  const todayStr = useMemo(() => getTodayStr(), []);

  // Render week view - memoized
  const weekView = useMemo(() => (
    <div className="week-grid">
      {weekDays.map((day, index) => (
        <DayCard
          key={index}
          day={day}
          shifts={getShiftsByDate(formatDate(day))}
          selectedShiftId={selectedShift?.id}
          onShiftClick={handleShiftClick}
          todayStr={todayStr}
        />
      ))}
    </div>
  ), [weekDays, getShiftsByDate, selectedShift?.id, handleShiftClick, todayStr]);

  // Render month view - memoized
  const monthView = useMemo(() => (
    <div className="month-container">
      <div className="month-grid">
        <div className="month-header">
          <h2>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        </div>
        <div className="month-weekdays">
          {WEEK_NAMES.map(day => <div key={day} className="month-weekday">{day}</div>)}
        </div>
        <div className="month-days">
          {monthDays.map((day, index) => {
            if (!day) return <div key={index} className="month-day empty"></div>;
            const dateStr = formatDate(day);
            const isToday = dateStr === todayStr;
            const dayShifts = getShiftsByDate(dateStr);
            const hasShifts = dayShifts.length > 0;
            
            return (
              <div 
                key={index} 
                className={`month-day ${isToday ? "today" : ""} ${hasShifts ? "has-shifts" : ""}`}
              >
                <div className="day-number">{day.getDate()}</div>
                <div className="day-shifts">
                  {dayShifts.map((shift) => (
                    <div 
                      key={shift.id} 
                      className={`day-shift-item ${selectedShift?.id === shift.id ? "active" : ""}`}
                      onClick={() => handleShiftClick(shift, day)}
                    >
                      {shift.start_time?.slice(0,5)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <DetailPanel shift={selectedShift} day={selectedDay} onClose={closeDetail} />
    </div>
  ), [monthDays, currentDate, todayStr, getShiftsByDate, selectedShift, selectedDay, handleShiftClick, closeDetail]);

  return (
    <div className="attendance-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="top-bar">
        <div>
          <h1 className="title">📅 Lịch làm việc</h1>
          <p className="subtitle">
            {shifts.length} ca làm
            {refreshing && <span className="refreshing-indicator"> 🔄 Đang cập nhật...</span>}
          </p>
        </div>
        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === "week" ? "active" : ""}`} 
            onClick={() => handleViewModeChange("week")}
          >
            📅 Tuần
          </button>
          <button 
            className={`view-btn ${viewMode === "month" ? "active" : ""}`} 
            onClick={() => handleViewModeChange("month")}
          >
            📆 Tháng
          </button>
        </div>
      </div>

      <div className="controls-bar">
        <div className="nav-controls">
          <button 
            onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousMonth} 
            className="control-btn"
            disabled={loading || refreshing}
          >
            ◀
          </button>
          <button 
            onClick={goToCurrent} 
            className="control-btn today-btn"
            disabled={loading || refreshing}
          >
            Hôm nay
          </button>
          <button 
            onClick={viewMode === "week" ? goToNextWeek : goToNextMonth} 
            className="control-btn"
            disabled={loading || refreshing}
          >
            ▶
          </button>
        </div>
        <button 
          className="refresh-btn" 
          onClick={() => fetchShifts(true)}
          disabled={loading || refreshing}
        >
          🔄
        </button>
      </div>

      {loading ? (
        <div className="loading">⏳ Đang tải lịch làm việc...</div>
      ) : viewMode === "week" ? (
        weekView
      ) : (
        monthView
      )}
    </div>
  );
}

export default Attendance;