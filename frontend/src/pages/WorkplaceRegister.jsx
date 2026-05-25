import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import "../styles/WorkplaceRegister.css";

function WorkplaceRegister() {
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(false);
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
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 2000);
  }, []);

  const fetchWorkplaces = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      // ĐÃ SỬA: dùng api instance, thêm prefix /api, sửa thành work-places
      const response = await api.get("/work-places/my");

      if (response.data.success) {
        setWorkplaces(response.data.workplaces || []);
      }
    } catch (error) {
      console.error("Lỗi fetch workplaces:", error);
      showToast("Không thể tải danh sách chỗ làm", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchWorkplaces();
  }, [fetchWorkplaces]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.hourly_rate) {
      showToast("Vui lòng nhập đầy đủ thông tin", "error");
      return;
    }

    if (parseFloat(formData.hourly_rate) <= 0) {
      showToast("Lương theo giờ phải lớn hơn 0", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      let response;

      const submitData = {
        name: formData.name,
        address: formData.address,
        hourly_rate: parseFloat(formData.hourly_rate),
        salary_per_hour: formData.salary_per_hour ? parseFloat(formData.salary_per_hour) : null,
        has_break: formData.has_break,
        break_minutes: formData.has_break ? parseInt(formData.break_minutes) : 0,
        overtime_rate: parseFloat(formData.overtime_rate),
      };

      if (editingWorkplace) {
        // ĐÃ SỬA: dùng api instance, thêm prefix /api, sửa thành work-places
        response = await api.put(`/work-places/${editingWorkplace.id}`, submitData);
        showToast("Cập nhật thành công!", "success");
      } else {
        // ĐÃ SỬA: dùng api instance, thêm prefix /api, sửa thành work-places
        response = await api.post("/work-places/register", submitData);
        showToast("Đăng ký thành công!", "success");
      }

      if (response.data.success) {
        resetForm();
        fetchWorkplaces();
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Có lỗi xảy ra", "error");
    }
  };

  const resetForm = () => {
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
  };

  const handleEdit = (workplace) => {
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
  };

  return (
    <div className="workplace-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === "success" ? "✅ " : "❌ "}
          {toast.message}
        </div>
      )}

      <div className="workplace-header">
        <h1 className="title">🏢 Chỗ làm</h1>
        <button className="btn-add" onClick={() => setShowForm(true)}>
          + Thêm
        </button>
      </div>

      {/* Form đăng ký */}
      {showForm && (
        <div className="modal-overlay">
          <form className="modal-box" onSubmit={handleSubmit}>
            <h2>{editingWorkplace ? "✏️ Sửa chỗ làm" : "➕ Thêm chỗ làm"}</h2>

            <div className="form-group">
              <label>Tên chỗ làm</label>
              <input
                type="text"
                placeholder="VD: Công ty ABC"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Địa chỉ</label>
              <input
                type="text"
                placeholder="VD: Biên Hòa"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Lương theo giờ</label>
                <input
                  type="number"
                  placeholder="25000"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Lương cơ bản</label>
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
                  <option value="false">Không</option>
                  <option value="true">Có</option>
                </select>
              </div>

              {formData.has_break && (
                <div className="form-group">
                  <label>Phút nghỉ</label>
                  <input
                    type="number"
                    value={formData.break_minutes}
                    onChange={(e) => setFormData({ ...formData, break_minutes: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Tăng ca (x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.overtime_rate}
                  onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-buttons">
              <button type="button" className="cancel-btn" onClick={resetForm}>Hủy</button>
              <button type="submit" className="save-btn">{editingWorkplace ? "Cập nhật" : "Thêm"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách chỗ làm - dạng grid ngang */}
      <div className="workplace-grid">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : workplaces.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <p>Chưa có chỗ làm</p>
            <button className="btn-empty" onClick={() => setShowForm(true)}>+ Thêm ngay</button>
          </div>
        ) : (
          workplaces.map((workplace) => (
            <div key={workplace.id} className="workplace-card">
              <div className="workplace-name">{workplace.name}</div>
              <div className="workplace-address">{workplace.address}</div>
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
                    <span className="stat-value">{workplace.break_minutes}'</span>
                  </div>
                )}
              </div>
              <button className="btn-edit" onClick={() => handleEdit(workplace)}>✏️ Sửa</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default WorkplaceRegister;