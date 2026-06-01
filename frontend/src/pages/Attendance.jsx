import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import api, { isRequestCanceled } from "../services/api";
import "../styles/Attendance.css";

const ATTENDANCE_CACHE_KEY = "attendance_shifts_cache";
const ATTENDANCE_CACHE_DURATION = 5 * 60 * 1000;

const getCachedAttendanceShifts = () => {
  try {
    const cached = localStorage.getItem(ATTENDANCE_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ATTENDANCE_CACHE_DURATION) {
      return data;
    }
  } catch (error) {
    console.error("Attendance cache read error:", error);
  }
  return null;
};

const setCachedAttendanceShifts = (data) => {
  try {
    localStorage.setItem(
      ATTENDANCE_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (error) {
    console.error("Attendance cache write error:", error);
  }
};

// Constants
const WEEK_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

// Format date helper - optimized
const formatDate = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => formatDate(new Date());

// Optimized Shift Card Component
const ShiftCard = memo(({ shift, isSelected, onClick }) => (
  <div 
    className={`shift-card ${shift.holiday_type === 'holiday' ? 'holiday' : ''} ${isSelected ? "selected" : ""}`}
    onClick={onClick}
    role="button"
    tabIndex={0}
  >
    <div className="shift-time">
      {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
    </div>
    <div className="shift-location">📍 {shift.workplace_name || shift.location}</div>
    {shift.holiday_type === 'holiday' && <div className="holiday-badge">🎉 Ngày lễ (x2)</div>}
  </div>
));

// Optimized Day Card Component - receives pre-filtered shifts
const DayCard = memo(({ day, dayShifts, selectedShiftId, onShiftClick, isToday }) => {
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
        {hasShifts ? (
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

// Virtualized Month Day Component
const MonthDay = memo(({ day, isToday, dayShifts, selectedShiftId, onShiftClick }) => {
  const hasShifts = dayShifts.length > 0;
  
  return (
    <div className={`month-day ${isToday ? "today" : ""} ${hasShifts ? "has-shifts" : ""}`}>
      <div className="day-number">{day.getDate()}</div>
      <div className="day-shifts">
        {dayShifts.slice(0, 3).map((shift) => (
          <div 
            key={shift.id} 
            className={`day-shift-item ${selectedShiftId === shift.id ? "active" : ""}`}
            onClick={() => onShiftClick(shift, day)}
          >
            {shift.start_time?.slice(0,5)}
          </div>
        ))}
        {dayShifts.length > 3 && <div className="more-shifts">+{dayShifts.length - 3}</div>}
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

// Toast Component
const Toast = memo(({ show, message, type }) => {
  if (!show) return null;
  return <div className={`toast-notification ${type}`}>{message}</div>;
});

function Attendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("attendance_view_mode") || "week";
  });
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const abortControllerRef = useRef(null);

  const showToast = useCallback((message, type = "error") => {
    const icon = type === "success" ? "✅ " : "❌ ";
    setToast({ show: true, message: icon + message, type });
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem("attendance_view_mode", mode);
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  // Navigation handlers - optimized with useCallback
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
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!isRefresh) {
      const cachedShifts = getCachedAttendanceShifts();
      if (cachedShifts) {
        setShifts(cachedShifts);
        setLoading(false);
      }
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!shifts.length) {
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
        const nextShifts = response.data.shifts || [];
        setShifts(nextShifts);
        setCachedAttendanceShifts(nextShifts);
      }
    } catch (error) {
      if (!isRequestCanceled(error)) {
        console.error("Lỗi fetch shifts:", error);
        if (error.response?.status !== 401) {
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
  }, [shifts.length, showToast]);

  // ==================== INITIAL LOAD & REFRESH LISTENER ====================
  useEffect(() => {
    // Force refresh khi component mount
    fetchShifts(false);
    
    // Lắng nghe sự kiện refresh từ App (khi chuyển trang)
    const handleRefresh = (event) => {
      const { dataType } = event.detail || {};
      if (dataType === "all" || dataType === "attendance") {
        fetchShifts(true);
      }
    };
    
    window.addEventListener("app-refresh", handleRefresh);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener("app-refresh", handleRefresh);
    };
  }, []); // Chạy 1 lần khi mount

  // Get week dates - memoized
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

  // Create shifts map for O(1) lookup - memoized
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

  const getShiftsByDate = useCallback((dateStr) => {
    return shiftsByDate.get(dateStr) || [];
  }, [shiftsByDate]);

  const handleShiftClick = useCallback((shift, day) => {
    if (selectedShift?.id === shift.id) {
      setSelectedShift(null);
      setSelectedDay(null);
    } else {
      setSelectedShift(shift);
      setSelectedDay(day);
    }
  }, [selectedShift]);

  const closeDetail = useCallback(() => {
    setSelectedShift(null);
    setSelectedDay(null);
  }, []);

  const todayStr = useMemo(() => getTodayStr(), []);

  // Pre-compute week view data
  const weekViewData = useMemo(() => {
    return weekDays.map(day => ({
      day,
      dateStr: formatDate(day),
      isToday: formatDate(day) === todayStr,
      dayShifts: getShiftsByDate(formatDate(day))
    }));
  }, [weekDays, getShiftsByDate, todayStr]);

  // Pre-compute month view data
  const monthViewData = useMemo(() => {
    return monthDays.map(day => {
      if (!day) return null;
      const dateStr = formatDate(day);
      return {
        day,
        dateStr,
        isToday: dateStr === todayStr,
        dayShifts: getShiftsByDate(dateStr)
      };
    });
  }, [monthDays, getShiftsByDate, todayStr]);

  const weekView = useMemo(() => (
    <div className="week-grid">
      {weekViewData.map((data, index) => (
        <DayCard
          key={index}
          day={data.day}
          dayShifts={data.dayShifts}
          selectedShiftId={selectedShift?.id}
          onShiftClick={handleShiftClick}
          isToday={data.isToday}
        />
      ))}
    </div>
  ), [weekViewData, selectedShift?.id, handleShiftClick]);

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
          {monthViewData.map((data, index) => {
            if (!data) return <div key={index} className="month-day empty"></div>;
            return (
              <MonthDay
                key={index}
                day={data.day}
                isToday={data.isToday}
                dayShifts={data.dayShifts}
                selectedShiftId={selectedShift?.id}
                onShiftClick={handleShiftClick}
              />
            );
          })}
        </div>
      </div>
      <DetailPanel shift={selectedShift} day={selectedDay} onClose={closeDetail} />
    </div>
  ), [monthViewData, currentDate, selectedShift?.id, selectedShift, selectedDay, handleShiftClick, closeDetail]);

  // Don't render if loading
  if (loading && !refreshing) {
    return (
      <div className="attendance-page">
        <div className="top-bar">
          <div>
            <h1 className="title">📅 Lịch làm việc</h1>
            <p className="subtitle">Đang tải...</p>
          </div>
        </div>
        <div className="loading-skeleton">
          <div className="skeleton-week-grid">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="skeleton-day-card"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      <div className="top-bar">
        <div>
          <h1 className="title">📅 Lịch làm việc</h1>
          <p className="subtitle">
            {shifts.length} ca làm
            {refreshing && <span className="refreshing-indicator"> 🔄</span>}
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
            disabled={refreshing}
          >
            ◀
          </button>
          <button onClick={goToCurrent} className="control-btn today-btn">Hôm nay</button>
          <button 
            onClick={viewMode === "week" ? goToNextWeek : goToNextMonth} 
            className="control-btn"
            disabled={refreshing}
          >
            ▶
          </button>
        </div>
        <button className="refresh-btn" onClick={() => fetchShifts(true)} disabled={refreshing}>
          🔄
        </button>
      </div>

      {viewMode === "week" ? weekView : monthView}
    </div>
  );
}

export default Attendance;
