import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import "../styles/Attendance.css";

function Attendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("week");
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const weekNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  // Điều hướng
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
    setSelectedShift(null);
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
    setSelectedShift(null);
    setSelectedDay(null);
  };

  const goToCurrent = () => {
    setCurrentDate(new Date());
    setSelectedShift(null);
    setSelectedDay(null);
  };

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      // Sửa API endpoint: /api/work-places/shifts/my (dựa trên route backend)
      const response = await api.get("/work-places/shifts/my");
      
      if (response.data.success) {
        setShifts(response.data.shifts || []);
      }
    } catch (error) {
      console.error("Lỗi fetch shifts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const getWeekDates = () => {
    const current = new Date(currentDate);
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(current.getDate() + diff);
    return [...Array(7)].map((_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  };

  const weekDays = getWeekDates();
  const todayStr = formatDate(new Date());

  const getShiftsByDate = (dateStr) => {
    return shifts.filter(shift => {
      const shiftDate = shift.shift_date?.split("T")[0];
      return shiftDate === dateStr;
    });
  };

  // Xử lý click vào shift
  const handleShiftClick = (shift, day) => {
    if (selectedShift?.id === shift.id) {
      setSelectedShift(null);
      setSelectedDay(null);
    } else {
      setSelectedShift(shift);
      setSelectedDay(day);
    }
  };

  // Đóng chi tiết
  const closeDetail = () => {
    setSelectedShift(null);
    setSelectedDay(null);
  };

  // Render tuần
  const renderWeekView = () => {
    return (
      <div className="week-grid">
        {weekDays.map((day, index) => {
          const dateStr = formatDate(day);
          const isToday = dateStr === todayStr;
          const dayShifts = getShiftsByDate(dateStr);
          const hasShifts = dayShifts.length > 0;

          return (
            <div key={index} className={`day-card ${isToday ? "today-card" : ""} ${hasShifts ? "has-shifts" : ""}`}>
              <div className="card-header">
                <span className="day-name">{weekNames[day.getDay()]}</span>
                <h2 className="day-number">{day.getDate()}</h2>
                <span className="month-name">{day.getMonth() + 1}/{day.getFullYear()}</span>
                {hasShifts && <span className="shift-count">{dayShifts.length}</span>}
              </div>
              <div className="shifts-list">
                {dayShifts.length > 0 ? (
                  dayShifts.map((shift) => (
                    <div 
                      key={shift.id} 
                      className={`shift-card ${selectedShift?.id === shift.id ? "selected" : ""}`}
                      onClick={() => handleShiftClick(shift, day)}
                    >
                      <div className="shift-time">
                        {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                      </div>
                      <div className="shift-location">{shift.workplace_name || shift.location}</div>
                      {shift.shift_type && <div className="shift-type">{shift.shift_type}</div>}
                    </div>
                  ))
                ) : (
                  <div className="empty-box">📭</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render tháng
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
      <div className="month-container">
        <div className="month-grid">
          <div className="month-header">
            <h2>{monthNames[month]} {year}</h2>
          </div>
          <div className="month-weekdays">
            {weekNames.map(day => <div key={day} className="month-weekday">{day}</div>)}
          </div>
          <div className="month-days">
            {days.map((day, index) => {
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

        {/* Chi tiết ca làm - hiển thị bên cạnh khi click */}
        {selectedShift && selectedDay && (
          <div className="shift-detail-panel">
            <button className="close-detail" onClick={closeDetail}>✕</button>
            <div className="detail-content">
              <div className="detail-date">
                📅 {selectedDay.getDate()}/{selectedDay.getMonth() + 1}/{selectedDay.getFullYear()}
              </div>
              <div className="detail-workplace">🏢 {selectedShift.workplace_name || selectedShift.location}</div>
              <div className="detail-time">⏰ {selectedShift.start_time?.slice(0,5)} - {selectedShift.end_time?.slice(0,5)}</div>
              {selectedShift.shift_type && <div className="detail-type">🏷️ {selectedShift.shift_type}</div>}
              <div className="detail-address">📍 {selectedShift.workplace_address || "Chưa có địa chỉ"}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="attendance-page">
      <div className="top-bar">
        <div>
          <h1 className="title">📅 Lịch làm việc</h1>
          <p className="subtitle">{shifts.length} ca làm</p>
        </div>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === "week" ? "active" : ""}`} onClick={() => {
            setViewMode("week");
            setSelectedShift(null);
            setSelectedDay(null);
          }}>📅 Tuần</button>
          <button className={`view-btn ${viewMode === "month" ? "active" : ""}`} onClick={() => {
            setViewMode("month");
            setSelectedShift(null);
            setSelectedDay(null);
          }}>📆 Tháng</button>
        </div>
      </div>

      <div className="controls-bar">
        <div className="nav-controls">
          <button onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousMonth} className="control-btn">◀</button>
          <button onClick={goToCurrent} className="control-btn today-btn">Hôm nay</button>
          <button onClick={viewMode === "week" ? goToNextWeek : goToNextMonth} className="control-btn">▶</button>
        </div>
      </div>

      {loading ? <div className="loading">Đang tải...</div> : viewMode === "week" ? renderWeekView() : renderMonthView()}
    </div>
  );
}

export default Attendance;