import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import api from "../services/api";
import "../styles/WorkplaceRegister.css";

// Constants
const TOAST_DURATION = 3000;

// Memoized Components
const Toast = memo(({ show, message, type }) => {
  if (!show) return null;
  return <div className={`toast-notification ${type}`}>{message}</div>;
});

const WorkplaceCard = memo(({ workplace, onEdit }) => (
  <div className="workplace-card">
    <div className="workplace-name">{workplace.name}</div>
    <div className="workplace-address">📍 {workplace.address}</div>
    <div className="workplace-stats">
      <div className="stat-item">
        <span className="stat-label">💰 Lương</span>
        <span className="stat-value">{parseFloat(workplace.hourly_rate).toLocaleString()}đ/h</span>
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
));

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

  const showToast = useCallback((message, type = "success") => {
    const icon = type === "success" ? "✅ " : "❌ ";
    setToast({ show: true, message: icon + message, type });
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const fetchWorkplaces = useCallback(async (isRefresh = false) => {
    const controller = new AbortController();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await api.get("/api/workplaces/my", {
        signal: controller.signal
      });

      if (response.data.success) {
        setWorkplaces(response.data.workplaces || []);
      }
    } catch (error) {
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        console.error("Lỗi fetch workplaces:", error);
        if (error.response?.status !== 401) {
          showToast("Không thể tải danh sách chỗ làm", "error");
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

  useEffect(() => {
    fetchWorkplaces();
  }, [fetchWorkplaces]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchWorkplaces(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchWorkplaces, loading, refreshing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.hourly_rate) {
      showToast("Vui lòng nhập đầy đủ thông tin (tên, địa chỉ, lương theo giờ)", "error");
      return;
    }

    if (parseFloat(formData.hourly_rate) <= 0) {
      showToast("Lương theo giờ phải lớn hơn 0", "error");
      return;
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        hourly_rate: parseFloat(formData.hourly_rate),
        salary_per_hour: formData.salary_per_hour ? parseFloat(formData.salary_per_hour) : null,
        has_break: formData.has_break,
        break_minutes: formData.has_break ? parseInt(formData.break_minutes) : 0,
        overtime_rate: parseFloat(formData.overtime_rate),
      };

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
        fetchWorkplaces(true);
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại", "error");
    }
  };

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
          <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingWorkplace ? "✏️ Sửa chỗ làm" : "➕ Thêm chỗ làm mới"}</h2>

            <div className="form-group">
              <label>Tên chỗ làm <span className="required">*</span></label>
              <input
                type="text"
                placeholder="VD: Công ty ABC, Quán cà phê XYZ"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Địa chỉ <span className="required">*</span></label>
              <input
                type="text"
                placeholder="VD: Biên Hòa, Đồng Nai"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Lương theo giờ (VNĐ) <span className="required">*</span></label>
                <input
                  type="number"
                  placeholder="25000"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Lương cơ bản (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Để trống"
                  value={formData.salary_per_hour}
                  onChange={(e) => setFormData({ ...formData, salary_per_hour: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Có tính giờ nghỉ?</label>
                <select
                  value={formData.has_break}
                  onChange={(e) => setFormData({ ...formData, has_break: e.target.value === "true" })}
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
                    value={formData.break_minutes}
                    onChange={(e) => setFormData({ ...formData, break_minutes: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Hệ số tăng ca</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.overtime_rate}
                  onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value })}
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
          workplaces.map((workplace) => (
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