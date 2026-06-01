import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import api from "../services/api";
import "../styles/Shift.css";

// Constants
const WEEK_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];
const TOAST_DURATION = 3000;
const REFRESH_INTERVAL = 30000; // 30 seconds

// Helper functions
const formatVNDate = (dateStr) => {
  if (!dateStr) return "";
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0];
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentDate = () => {
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = vnNow.getUTCFullYear();
  const month = String(vnNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnNow.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Memoized Components
const ShiftCard = memo(({ shift, onEdit, onDelete }) => (
  <div className={`shift-card ${shift.holiday_type === 'holiday' ? 'holiday' : ''}`}>
    <div className="shift-actions">
      <button className="edit-btn" onClick={() => onEdit(shift)} aria-label="Sửa">✏️</button>
      <button className="delete-btn" onClick={() => onDelete(shift.id)} aria-label="Xóa">✕</button>
    </div>
    <div className="shift-time">⏰ {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}</div>
    <div className="shift-location">📍 {shift.workplace_name}</div>
    {shift.holiday_type === 'holiday' && <div className="holiday-badge">🎉 Ngày lễ (x2)</div>}
  </div>
));

const DayCard = memo(({ day, todayStr, shifts, onAddShift, onEditShift, onDeleteShift }) => {
  const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const isToday = dateStr === todayStr;
  
  const dayShifts = useMemo(() => 
    shifts.filter(shift => {
      const shiftDate = shift.shift_date?.split('T')[0];
      return shiftDate === dateStr;
    }), [shifts, dateStr]
  );

  return (
    <div className={`day-card ${isToday ? "today-card" : ""}`}>
      <div className="card-header">
        <span className="day-name">{WEEK_NAMES[day.getDay()]}</span>
        <h2 className="day-number">{day.getDate()}</h2>
        <span className="month-name">{day.getMonth() + 1}/{day.getFullYear()}</span>
        {dayShifts.length > 0 && <span className="shift-count">{dayShifts.length}</span>}
      </div>
      <div className="shifts-list">
        {dayShifts.length > 0 ? (
          dayShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} onEdit={onEditShift} onDelete={onDeleteShift} />
          ))
        ) : (
          <div className="empty-box">📭 Không có ca</div>
        )}
      </div>
      <button className="add-btn" onClick={() => onAddShift(dateStr)}>+ Thêm</button>
    </div>
  );
});

const Toast = memo(({ show, message, type }) => {
  if (!show) return null;
  return <div className={`toast-notification ${type}`}>{message}</div>;
});

const LoadingSpinner = memo(() => (
  <div className="loading-overlay">
    <div className="spinner"></div>
    <div className="loading-text">Đang tải...</div>
  </div>
));

function Shift() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingShift, setEditingShift] = useState(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
    workplace_id: "",
    holiday_type: "normal",
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    const timer = setTimeout(() => setToast({ show: false, message: "", type: "" }), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleMonthChange = useCallback((e) => {
    const [year, month] = e.target.value.split('-');
    setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
  }, []);

  // Fetch data with abort controller
  const fetchWorkplaces = useCallback(async () => {
    try {
      const response = await api.get("/api/workplaces/my");
      setWorkplaces(response.data.workplaces || []);
    } catch (error) {
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        console.error("Lỗi fetch workplaces:", error);
        if (error.response?.status !== 401) {
          showToast("Không thể tải danh sách chỗ làm", "error");
        }
      }
    }
  }, [showToast]);

  const fetchShifts = useCallback(async (isRefresh = false) => {
    const controller = new AbortController();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const params = selectedWorkplace ? { workplace_id: selectedWorkplace } : {};
      const response = await api.get("/api/workplaces/shifts/my", { 
        params,
        signal: controller.signal
      });
      
      if (response.data.success) {
        const processedShifts = (response.data.shifts || []).map(shift => ({
          ...shift,
          shift_date: formatVNDate(shift.shift_date)
        }));
        setShifts(processedShifts);
      } else {
        setShifts([]);
      }
    } catch (error) {
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        console.error("Lỗi fetch shifts:", error);
        if (error.response?.status !== 401) {
          setShifts([]);
          showToast("Không thể tải danh sách ca làm", "error");
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
  }, [selectedWorkplace, showToast]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchShifts(), fetchWorkplaces()]);
    };
    loadData();
  }, [fetchShifts, fetchWorkplaces]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchShifts(true);
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchShifts, loading, refreshing]);

  // Form handlers
  const resetForm = useCallback(() => {
    setEditingShift(null);
    setSelectedDate("");
    setFormData({
      start_time: "",
      end_time: "",
      workplace_id: "",
      holiday_type: "normal",
    });
  }, []);

  const openAddForm = useCallback((dateStr) => {
    setSelectedDate(dateStr);
    setEditingShift(null);
    setFormData({
      start_time: "",
      end_time: "",
      workplace_id: "",
      holiday_type: "normal",
    });
    setShowForm(true);
  }, []);

  const handleEditShift = useCallback((shift) => {
    setEditingShift(shift);
    const shiftDate = shift.shift_date ? formatVNDate(shift.shift_date) : "";
    setSelectedDate(shiftDate);
    setFormData({
      start_time: shift.start_time,
      end_time: shift.end_time,
      workplace_id: shift.workplace_id,
      holiday_type: shift.holiday_type || "normal",
    });
    setShowForm(true);
  }, []);

  const handleSubmitShift = useCallback(async (e) => {
    e.preventDefault();
    
    if (!selectedDate) {
      showToast("Vui lòng chọn ngày bằng cách click vào nút + Thêm trên lịch", "error");
      return;
    }
    if (!formData.workplace_id) {
      showToast("Vui lòng chọn chỗ làm", "error");
      return;
    }
    if (!formData.start_time) {
      showToast("Vui lòng chọn giờ bắt đầu", "error");
      return;
    }
    if (!formData.end_time) {
      showToast("Vui lòng chọn giờ kết thúc", "error");
      return;
    }
    if (formData.start_time >= formData.end_time) {
      showToast("Giờ kết thúc phải lớn hơn giờ bắt đầu", "error");
      return;
    }

    const submitData = {
      shift_date: selectedDate,
      start_time: formData.start_time,
      end_time: formData.end_time,
      workplace_id: parseInt(formData.workplace_id),
      holiday_type: formData.holiday_type,
    };

    try {
      let response;
      
      if (editingShift) {
        response = await api.put(`/api/workplaces/shifts/${editingShift.id}`, submitData);
        showToast("Cập nhật ca thành công!", "success");
      } else {
        response = await api.post("/api/workplaces/shifts/create", submitData);
        showToast("Đăng ký ca làm thành công!", "success");
      }

      if (response.data.success) {
        setShowForm(false);
        resetForm();
        fetchShifts(true);
      } else {
        showToast(response.data.message || "Có lỗi xảy ra", "error");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Lỗi tạo/cập nhật ca", "error");
    }
  }, [selectedDate, formData, editingShift, resetForm, fetchShifts, showToast]);

  const handleDeleteShift = useCallback(async (id) => {
    if (!window.confirm("⚠️ Bạn có chắc chắn muốn xóa ca làm này?")) return;
    
    try {
      const response = await api.delete(`/api/workplaces/shifts/${id}`);
      if (response.data.success) {
        showToast("Xóa ca thành công!", "success");
        fetchShifts(true);
      } else {
        showToast(response.data.message, "error");
      }
    } catch (error) {
      showToast("Lỗi xóa ca", "error");
    }
  }, [fetchShifts, showToast]);

  // Memoized values
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

  const todayStr = useMemo(() => getCurrentDate(), []);
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const formatDisplayDate = useCallback((dateStr) => {
    if (!dateStr) return "Chưa chọn ngày";
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  }, []);

  // Memoized shift map for better performance
  const shiftsByDateMap = useMemo(() => {
    const map = new Map();
    shifts.forEach(shift => {
      const dateKey = shift.shift_date?.split('T')[0];
      if (dateKey) {
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey).push(shift);
      }
    });
    return map;
  }, [shifts]);

  // Optimized get shifts by date using map
  const getShiftsByDate = useCallback((dateStr) => {
    return shiftsByDateMap.get(dateStr) || [];
  }, [shiftsByDateMap]);

  return (
    <div className="shift-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      
      {refreshing && <div className="refreshing-overlay">🔄 Đang cập nhật...</div>}

      <div className="top-bar">
        <div>
          <h1 className="title">📅 Quản lý ca làm</h1>
          <p className="subtitle">{workplaces.length} chỗ làm | {shifts.length} ca</p>
        </div>
      </div>

      <div className="filter-bar">
        <select 
          className="filter-select"
          value={selectedWorkplace}
          onChange={(e) => setSelectedWorkplace(e.target.value)}
        >
          <option value="">📋 Tất cả chỗ làm</option>
          {workplaces.map(w => (
            <option key={w.id} value={w.id}>🏢 {w.name}</option>
          ))}
        </select>
      </div>

      <div className="controls-bar">
        <div className="month-controls">
          <button onClick={goToPreviousMonth} className="control-btn" aria-label="Tháng trước">◀</button>
          <select 
            value={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`} 
            onChange={handleMonthChange} 
            className="month-select"
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={index} value={`${currentYear}-${String(index + 1).padStart(2, '0')}`}>
                {month} {currentYear}
              </option>
            ))}
          </select>
          <button onClick={goToNextMonth} className="control-btn" aria-label="Tháng sau">▶</button>
          <button onClick={goToCurrentWeek} className="control-btn today-btn">Hôm nay</button>
        </div>

        <div className="week-controls">
          <button onClick={goToPreviousWeek} className="control-btn" aria-label="Tuần trước">◀</button>
          <span className="week-info">Tuần</span>
          <button onClick={goToNextWeek} className="control-btn" aria-label="Tuần sau">▶</button>
        </div>
      </div>

      <div className="week-grid">
        {weekDays.map((day, index) => (
          <DayCard
            key={index}
            day={day}
            todayStr={todayStr}
            shifts={shifts}
            onAddShift={openAddForm}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
          />
        ))}
      </div>

      <button className="fab" onClick={() => openAddForm(getCurrentDate())} aria-label="Thêm ca">+</button>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitShift}>
            <h2>{editingShift ? "✏️ Cập nhật ca" : "➕ Đăng ký ca mới"}</h2>

            <div className="form-group date-display" style={{ 
              backgroundColor: selectedDate ? '#e8f5e9' : '#ffebee', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '15px'
            }}>
              <label style={{ fontWeight: 'bold', color: selectedDate ? '#2e7d32' : '#c62828' }}>
                📅 NGÀY LÀM VIỆC:
              </label>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>
                🗓️ {formatDisplayDate(selectedDate)}
              </div>
            </div>

            <div className="form-group">
              <label>⏰ Giờ bắt đầu *</label>
              <input 
                type="time" 
                value={formData.start_time} 
                onChange={(e) => setFormData(prev => ({...prev, start_time: e.target.value}))} 
                required 
              />
            </div>

            <div className="form-group">
              <label>⏰ Giờ kết thúc *</label>
              <input 
                type="time" 
                value={formData.end_time} 
                onChange={(e) => setFormData(prev => ({...prev, end_time: e.target.value}))} 
                required 
              />
            </div>

            <div className="form-group">
              <label>🎉 Loại ngày</label>
              <select 
                value={formData.holiday_type} 
                onChange={(e) => setFormData(prev => ({...prev, holiday_type: e.target.value}))}
              >
                <option value="normal">📅 Ngày thường</option>
                <option value="holiday">🎉 Ngày lễ (x2)</option>
              </select>
            </div>

            <div className="form-group">
              <label>📍 Chỗ làm *</label>
              <select 
                value={formData.workplace_id} 
                onChange={(e) => setFormData(prev => ({...prev, workplace_id: e.target.value}))} 
                required
              >
                <option value="">-- Chọn chỗ làm --</option>
                {workplaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    🏢 {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-buttons">
              <button type="button" className="cancel-btn" onClick={() => { setShowForm(false); resetForm(); }}>
                Hủy
              </button>
              <button type="submit" className="save-btn">
                {editingShift ? "Cập nhật" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <LoadingSpinner />}
    </div>
  );
}

export default Shift;