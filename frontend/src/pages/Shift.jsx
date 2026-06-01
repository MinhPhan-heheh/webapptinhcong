import React, { useEffect, useState, useCallback, useMemo, memo, useRef, startTransition } from "react";
import api, { isRequestCanceled } from "../services/api";
import "../styles/Shift.css";

// Constants
const WEEK_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];
const TOAST_DURATION = 3000;
const REFRESH_INTERVAL = 30000; // 30 seconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "shift_cache";

// Cache Manager
const cacheManager = {
  get: (key) => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (e) {
      console.error("Cache read error:", e);
    }
    return null;
  },
  set: (key, data) => {
    try {
      localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error("Cache write error:", e);
    }
  },
  clear: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  }
};

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

const DayCard = memo(({ day, todayStr, shiftsMap, onAddShift, onEditShift, onDeleteShift }) => {
  const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const isToday = dateStr === todayStr;
  const dayShifts = shiftsMap.get(dateStr) || [];
  const hasShifts = dayShifts.length > 0;

  return (
    <div className={`day-card ${isToday ? "today-card" : ""}`}>
      <div className="card-header">
        <span className="day-name">{WEEK_NAMES[day.getDay()]}</span>
        <h2 className="day-number">{day.getDate()}</h2>
        <span className="month-name">{day.getMonth() + 1}/{day.getFullYear()}</span>
        {hasShifts && <span className="shift-count">{dayShifts.length}</span>}
      </div>
      <div className="shifts-list">
        {hasShifts ? (
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
  const [selectedWorkplace, setSelectedWorkplace] = useState(() => {
    return localStorage.getItem("selected_workplace") || "";
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
    workplace_id: "",
    holiday_type: "normal",
  });

  // Refs
  const abortControllerRef = useRef(null);
  const cacheKey = useMemo(() => `shifts_${selectedWorkplace}`, [selectedWorkplace]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    const timer = setTimeout(() => setToast({ show: false, message: "", type: "" }), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Save selected workplace to localStorage
  const handleWorkplaceChange = useCallback((value) => {
    setSelectedWorkplace(value);
    localStorage.setItem("selected_workplace", value);
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

  // Fetch workplaces with caching
  const fetchWorkplaces = useCallback(async () => {
    const cachedWorkplaces = cacheManager.get("workplaces");
    if (cachedWorkplaces) {
      setWorkplaces(cachedWorkplaces);
      return;
    }

    try {
      const response = await api.get("/api/workplaces/my");
      if (response.data.success) {
        const workplaceData = response.data.workplaces || [];
        setWorkplaces(workplaceData);
        cacheManager.set("workplaces", workplaceData);
      }
    } catch (error) {
      if (!isRequestCanceled(error)) {
        console.error("Lỗi fetch workplaces:", error);
        if (error.response?.status !== 401) {
          showToast("Không thể tải danh sách chỗ làm", "error");
        }
      }
    }
  }, [showToast]);

  // Fetch shifts with caching and abort
  const fetchShifts = useCallback(async (isRefresh = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache
    if (!isRefresh) {
      const cachedShifts = cacheManager.get(cacheKey);
      if (cachedShifts) {
        startTransition(() => {
          setShifts(cachedShifts);
        });
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      startTransition(() => {
        if (isRefresh) {
          setRefreshing(true);
        } else if (!shifts.length) {
          setLoading(true);
        }
      });

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
        
        startTransition(() => {
          setShifts(processedShifts);
        });
        
        // Cache the data
        cacheManager.set(cacheKey, processedShifts);
      } else {
        startTransition(() => {
          setShifts([]);
        });
      }
    } catch (error) {
      if (!isRequestCanceled(error)) {
        console.error("Lỗi fetch shifts:", error);
        if (error.response?.status !== 401) {
          startTransition(() => {
            setShifts([]);
          });
          showToast("Không thể tải danh sách ca làm", "error");
        }
      }
    } finally {
      startTransition(() => {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      });
    }
  }, [selectedWorkplace, cacheKey, shifts.length, showToast]);

  // ==================== INITIAL LOAD & REFRESH LISTENER ====================
  useEffect(() => {
    const loadData = async () => {
      // Force refresh khi component mount (bỏ qua cache)
      await Promise.all([fetchShifts(false), fetchWorkplaces()]);
    };
    loadData();

    // Lắng nghe sự kiện refresh từ App (khi chuyển trang)
    const handleRefresh = (event) => {
      const { dataType } = event.detail || {};
      if (dataType === "all" || dataType === "shifts") {
        cacheManager.clear();
        fetchShifts(true);
        fetchWorkplaces();
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

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing && !showForm) {
        fetchShifts(true);
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchShifts, loading, refreshing, showForm]);

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
        // Clear cache and refresh
        cacheManager.clear();
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
        // Clear cache and refresh
        cacheManager.clear();
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

  // Optimized shifts map for O(1) lookup
  const shiftsMap = useMemo(() => {
    const map = new Map();
    for (const shift of shifts) {
      const dateKey = shift.shift_date?.split('T')[0];
      if (dateKey) {
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey).push(shift);
      }
    }
    return map;
  }, [shifts]);

  const formatDisplayDate = useCallback((dateStr) => {
    if (!dateStr) return "Chưa chọn ngày";
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  }, []);

  // Loading state
  if (loading && !refreshing) {
    return (
      <div className="shift-page">
        <div className="top-bar">
          <div>
            <h1 className="title">📅 Quản lý ca làm</h1>
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
          onChange={(e) => handleWorkplaceChange(e.target.value)}
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
            shiftsMap={shiftsMap}
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
              borderRadius: '12px', 
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
    </div>
  );
}

export default Shift;
