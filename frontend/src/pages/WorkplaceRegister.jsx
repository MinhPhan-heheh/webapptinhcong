import React, { useState, useEffect, useCallback, useMemo, memo, useRef, startTransition } from "react";
import api, { triggerRefresh } from "../services/api";
import "../styles/WorkplaceRegister.css";

// Constants
const TOAST_DURATION = 3000;
const REFRESH_INTERVAL = 30000; // 30 seconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "workplace_cache";

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

// Memoized Components
const Toast = memo(({ show, message, type }) => {
  if (!show) return null;
  return <div className={`toast-notification ${type}`}>{message}</div>;
});

const WorkplaceCard = memo(({ workplace, onEdit }) => {
  const hourlyRate = useMemo(() => 
    parseFloat(workplace.hourly_rate).toLocaleString(), 
    [workplace.hourly_rate]
  );
  
  return (
    <div className="workplace-card">
      <div className="workplace-name">{workplace.name}</div>
      <div className="workplace-address">📍 {workplace.address}</div>
      <div className="workplace-stats">
        <div className="stat-item">
          <span className="stat-label">💰 Lương</span>
          <span className="stat-value">{hourlyRate}đ/h</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">⚡ Tăng ca</span>
          <span className="stat-value">{workplace.overtime_rate || 1.5}x</span>
        </div>
        {workplace.has_break && (
          <div className="stat-item">
            <span className="stat-label">🍜 Nghỉ</span>
            <span className="stat-value">{workplace.break_minutes} phút</span>
          </div>
        )}
      </div>
      <button className="btn-edit" onClick={() => onEdit(workplace)}>✏️ Sửa</button>
    </div>
  );
});

const LoadingSkeleton = memo(() => (
  <div className="loading-skeleton">
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
  </div>
));

const EmptyState = memo(({ onAdd }) => (
  <div className="empty-state">
    <div className="empty-icon">🏢</div>
    <p>Chưa có chỗ làm nào</p>
    <button className="btn-empty" onClick={onAdd}>+ Thêm chỗ làm ngay</button>
  </div>
));

function WorkplaceRegister() {
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    hourly_rate: "",
    salary_per_hour: "",
    has_break: false,
    break_minutes: "30",
    overtime_rate: "1.5",
  });

  // Refs
  const abortControllerRef = useRef(null);
  const formRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    const icon = type === "success" ? "✅ " : "❌ ";
    setToast({ show: true, message: icon + message, type });
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Fetch workplaces with caching and abort
  const fetchWorkplaces = useCallback(async (isRefresh = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache
    if (!isRefresh) {
      const cachedWorkplaces = cacheManager.get("workplaces");
      if (cachedWorkplaces) {
        startTransition(() => {
          setWorkplaces(cachedWorkplaces);
        });
        return;
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      startTransition(() => {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      });

      const response = await api.get("/api/workplaces/my", {
        signal: controller.signal
      });

      if (response.data.success) {
        const workplaceData = response.data.workplaces || [];
        
        startTransition(() => {
          setWorkplaces(workplaceData);
        });
        
        // Cache the data
        cacheManager.set("workplaces", workplaceData);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Lỗi fetch workplaces:", error);
        if (error.response?.status !== 401) {
          showToast("Không thể tải danh sách chỗ làm", "error");
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
  }, [showToast]);

  // ==================== INITIAL LOAD & REFRESH LISTENER ====================
  useEffect(() => {
    // Force refresh khi component mount
    fetchWorkplaces(true);
    
    // Lắng nghe sự kiện refresh từ App (khi chuyển trang)
    const handleRefresh = (event) => {
      const { dataType } = event.detail || {};
      if (dataType === "all" || dataType === "workplaces") {
        cacheManager.clear();
        fetchWorkplaces(true);
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
        fetchWorkplaces(true);
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchWorkplaces, loading, refreshing, showForm]);

  // Handle form input changes - optimized
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const address = formData.address.trim();
    const hourlyRate = parseFloat(formData.hourly_rate);

    if (!name || !address || !hourlyRate) {
      showToast("Vui lòng nhập đầy đủ thông tin (tên, địa chỉ, lương theo giờ)", "error");
      return;
    }

    if (hourlyRate <= 0) {
      showToast("Lương theo giờ phải lớn hơn 0", "error");
      return;
    }

    const submitData = {
      name,
      address,
      hourly_rate: hourlyRate,
      salary_per_hour: formData.salary_per_hour ? parseFloat(formData.salary_per_hour) : null,
      has_break: formData.has_break,
      break_minutes: formData.has_break ? parseInt(formData.break_minutes) : 0,
      overtime_rate: parseFloat(formData.overtime_rate),
    };

    try {
      let response;
      if (editingWorkplace) {
        response = await api.put(`/api/workplaces/${editingWorkplace.id}`, submitData);
        showToast("Cập nhật chỗ làm thành công!", "success");
      } else {
        response = await api.post("/api/workplaces/register", submitData);
        showToast("Đăng ký chỗ làm mới thành công!", "success");
      }

      if (response.data.success) {
        resetForm();
        // Clear cache and refresh
        cacheManager.clear();
        fetchWorkplaces(true);
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại", "error");
    }
  }, [formData, editingWorkplace, showToast, fetchWorkplaces]);

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditingWorkplace(null);
    setFormData({
      name: "",
      address: "",
      hourly_rate: "",
      salary_per_hour: "",
      has_break: false,
      break_minutes: "30",
      overtime_rate: "1.5",
    });
  }, []);

  const handleEdit = useCallback((workplace) => {
    setEditingWorkplace(workplace);
    setFormData({
      name: workplace.name,
      address: workplace.address,
      hourly_rate: workplace.hourly_rate,
      salary_per_hour: workplace.salary_per_hour || "",
      has_break: workplace.has_break || false,
      break_minutes: workplace.break_minutes?.toString() || "30",
      overtime_rate: workplace.overtime_rate?.toString() || "1.5",
    });
    setShowForm(true);
  }, []);

  const handleAddNew = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  // Memoized values
  const hasWorkplaces = useMemo(() => workplaces.length > 0, [workplaces]);
  
  // Sort workplaces by name for consistent display
  const sortedWorkplaces = useMemo(() => {
    return [...workplaces].sort((a, b) => a.name.localeCompare(b.name));
  }, [workplaces]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <div className="workplace-page">
        <div className="workplace-header">
          <h1 className="title">🏢 Chỗ làm</h1>
          <button className="btn-add" onClick={handleAddNew}>+ Thêm chỗ làm</button>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="workplace-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      
      {refreshing && <div className="refreshing-overlay">🔄 Đang cập nhật...</div>}

      <div className="workplace-header">
        <h1 className="title">🏢 Chỗ làm</h1>
        <button className="btn-add" onClick={handleAddNew}>
          + Thêm chỗ làm
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <form className="modal-box" onSubmit={handleSubmit} ref={formRef}>
            <h2>{editingWorkplace ? "✏️ Sửa chỗ làm" : "➕ Thêm chỗ làm mới"}</h2>

            <div className="form-group">
              <label>Tên chỗ làm <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                placeholder="VD: Công ty ABC, Quán cà phê XYZ"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Địa chỉ <span className="required">*</span></label>
              <input
                type="text"
                name="address"
                placeholder="VD: Biên Hòa, Đồng Nai"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Lương theo giờ (VNĐ) <span className="required">*</span></label>
                <input
                  type="number"
                  name="hourly_rate"
                  placeholder="25000"
                  value={formData.hourly_rate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Lương cơ bản (VNĐ)</label>
                <input
                  type="number"
                  name="salary_per_hour"
                  placeholder="Để trống"
                  value={formData.salary_per_hour}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Có tính giờ nghỉ?</label>
                <select
                  name="has_break"
                  value={formData.has_break}
                  onChange={handleInputChange}
                >
                  <option value="false">❌ Không</option>
                  <option value="true">✅ Có</option>
                </select>
              </div>

              {formData.has_break && (
                <div className="form-group">
                  <label>Thời gian nghỉ (phút)</label>
                  <input
                    type="number"
                    name="break_minutes"
                    value={formData.break_minutes}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Hệ số tăng ca</label>
                <input
                  type="number"
                  name="overtime_rate"
                  step="0.1"
                  value={formData.overtime_rate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="modal-buttons">
              <button type="button" className="cancel-btn" onClick={resetForm}>Hủy bỏ</button>
              <button type="submit" className="save-btn">{editingWorkplace ? "Cập nhật" : "Thêm mới"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="workplace-grid">
        {hasWorkplaces ? (
          sortedWorkplaces.map((workplace) => (
            <WorkplaceCard key={workplace.id} workplace={workplace} onEdit={handleEdit} />
          ))
        ) : (
          <EmptyState onAdd={handleAddNew} />
        )}
      </div>
    </div>
  );
}

export default WorkplaceRegister;