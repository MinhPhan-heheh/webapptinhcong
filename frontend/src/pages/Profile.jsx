import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import api from "../services/api";
import "../styles/Profile.css";

// Constants
const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const TOAST_DURATION = 3000;

// Toast Component - memoized
const Toast = memo(({ show, message, type }) => {
  if (!show) return null;
  return (
    <div className={`toast-notification ${type}`}>
      {message}
    </div>
  );
});

// Avatar Component - memoized
const AvatarSection = memo(({ 
  user, 
  hasAvatar, 
  previewUrl, 
  uploading, 
  selectedFile, 
  getAvatarUrl, 
  getInitials, 
  onFileChange, 
  onUpload, 
  onRemove 
}) => (
  <div className="avatar-section">
    <div className="avatar-wrapper">
      {hasAvatar || previewUrl ? (
        <img
          src={getAvatarUrl()}
          alt="Avatar"
          className="profile-avatar"
          onError={onRemove}
        />
      ) : (
        <div className="profile-avatar-default">{getInitials()}</div>
      )}
      <label className="avatar-upload-label" title="Chọn ảnh đại diện">
        📷
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
      </label>
    </div>

    {selectedFile && (
      <button
        className="avatar-btn save-avatar-btn"
        onClick={onUpload}
        disabled={uploading}
      >
        {uploading ? "⏳ Đang tải..." : "💾 Lưu ảnh"}
      </button>
    )}

    {user?.avatar && !selectedFile && (
      <button className="avatar-btn remove-avatar-btn" onClick={onRemove}>
        🗑️ Xóa ảnh
      </button>
    )}

    <div className="avatar-note">Chấp nhận file JPG, PNG, GIF (tối đa 2MB)</div>
  </div>
));

// Profile Info Component - memoized
const ProfileInfo = memo(({ user, editing, formData, onEdit, onCancel, onChange, onSubmit }) => (
  <div className="profile-info-card">
    <div className="card-header">
      <h2>📋 Thông tin cá nhân</h2>
      {!editing && (
        <button className="edit-btn" onClick={onEdit}>
          ✏️ Sửa
        </button>
      )}
    </div>

    {editing ? (
      <form onSubmit={onSubmit} className="profile-form">
        <div className="form-group">
          <label>Họ và tên</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={onChange}
            required
            placeholder="Nhập họ và tên"
          />
        </div>

        <div className="form-group">
          <label>Số điện thoại</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={onChange}
            placeholder="Nhập số điện thoại"
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input type="email" value={user?.email || ""} disabled className="disabled-input" />
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Hủy
          </button>
          <button type="submit" className="save-btn">
            Lưu thay đổi
          </button>
        </div>
      </form>
    ) : (
      <div className="profile-details">
        <div className="detail-row">
          <span className="detail-label">👤 Họ và tên</span>
          <span className="detail-value">{user?.full_name || "Chưa cập nhật"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">📧 Email</span>
          <span className="detail-value">{user?.email}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">📞 Số điện thoại</span>
          <span className="detail-value">{user?.phone || "Chưa cập nhật"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">✅ Trạng thái</span>
          <span className={`verify-status ${user?.is_verified ? "verified" : "unverified"}`}>
            {user?.is_verified ? "Đã xác thực" : "Chưa xác thực"}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">📅 Ngày tham gia</span>
          <span className="detail-value">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : ""}
          </span>
        </div>
      </div>
    )}
  </div>
));

// Password Change Component - memoized
const PasswordChange = memo(({ changingPassword, passwordData, onToggle, onChange, onSubmit }) => (
  <div className="profile-info-card">
    <div className="card-header">
      <h2>🔐 Đổi mật khẩu</h2>
      {!changingPassword && (
        <button className="edit-btn" onClick={onToggle}>
          ✏️ Đổi mật khẩu
        </button>
      )}
    </div>

    {changingPassword && (
      <form onSubmit={onSubmit} className="profile-form">
        <div className="form-group">
          <label>Mật khẩu hiện tại</label>
          <input
            type="password"
            name="current_password"
            value={passwordData.current_password}
            onChange={onChange}
            required
            placeholder="Nhập mật khẩu hiện tại"
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu mới</label>
          <input
            type="password"
            name="new_password"
            value={passwordData.new_password}
            onChange={onChange}
            required
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
          />
        </div>

        <div className="form-group">
          <label>Xác nhận mật khẩu mới</label>
          <input
            type="password"
            name="confirm_password"
            value={passwordData.confirm_password}
            onChange={onChange}
            required
            placeholder="Nhập lại mật khẩu mới"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onToggle}>
            Hủy
          </button>
          <button type="submit" className="save-btn">
            Đổi mật khẩu
          </button>
        </div>
      </form>
    )}
  </div>
));

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Fetch profile with abort controller
  const fetchProfile = useCallback(async (isRefresh = false) => {
    const controller = new AbortController();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await api.get("/api/profile/", {
        signal: controller.signal
      });

      if (response.data.success) {
        setUser(response.data.user);
        setFormData({
          full_name: response.data.user.full_name || "",
          phone: response.data.user.phone || "",
        });
        setAvatarError(false);
        
        // Update localStorage
        const currentUser = localStorage.getItem("user");
        if (currentUser) {
          const updatedUser = { ...JSON.parse(currentUser), ...response.data.user };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
        console.error("Lỗi fetch profile:", error.response?.data || error.message);
        if (error.response?.status === 401) {
          showToast("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", "error");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setTimeout(() => window.location.href = "/", 2000);
        } else {
          showToast("Không thể tải thông tin hồ sơ", "error");
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

  // ==================== INITIAL LOAD & REFRESH LISTENER ====================
  useEffect(() => {
    // Force refresh khi component mount
    fetchProfile(true);
    
    // Lắng nghe sự kiện refresh từ App (khi chuyển trang)
    const handleRefresh = (event) => {
      const { dataType } = event.detail || {};
      if (dataType === "all" || dataType === "profile") {
        fetchProfile(true);
      }
    };
    
    window.addEventListener("app-refresh", handleRefresh);
    
    return () => {
      window.removeEventListener("app-refresh", handleRefresh);
    };
  }, []); // Chạy 1 lần khi mount

  // Handle form input change
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle password input change
  const handlePasswordChange = useCallback((e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Update profile
  const handleUpdateProfile = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put("/api/profile/", formData);
      if (response.data.success) {
        setUser(response.data.user);
        setEditing(false);
        showToast("Cập nhật hồ sơ thành công!", "success");
        
        // Refresh dashboard data
        window.dispatchEvent(new Event("storage"));
        triggerRefresh("profile");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Lỗi cập nhật", "error");
    }
  }, [formData, showToast]);

  // Change password
  const handleChangePassword = useCallback(async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast("Mật khẩu xác nhận không khớp", "error");
      return;
    }

    if (passwordData.new_password.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự", "error");
      return;
    }

    try {
      const response = await api.put("/api/profile/password", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      if (response.data.success) {
        setChangingPassword(false);
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        showToast("Đổi mật khẩu thành công!", "success");
        triggerRefresh("profile");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Lỗi đổi mật khẩu", "error");
    }
  }, [passwordData, showToast]);

  // Handle file selection
  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > AVATAR_MAX_SIZE) {
      showToast("Ảnh không được vượt quá 2MB", "error");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)", "error");
      return;
    }

    // Clear old preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAvatarError(false);
    showToast("Đã chọn ảnh, nhấn 'Lưu ảnh' để cập nhật", "success");
  }, [previewUrl, showToast]);

  // Upload avatar
  const handleUploadAvatar = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("avatar", selectedFile);

    try {
      const response = await api.post("/api/profile/avatar", formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setUser(response.data.user);
        setSelectedFile(null);
        
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        
        setAvatarError(false);
        showToast("Cập nhật ảnh đại diện thành công!", "success");
        
        // Refresh profile and dashboard
        fetchProfile(true);
        window.dispatchEvent(new Event("storage"));
        triggerRefresh("profile");
      }
    } catch (error) {
      console.error("Upload error:", error.response?.data || error.message);
      showToast(error.response?.data?.message || "Lỗi upload ảnh", "error");
    } finally {
      setUploading(false);
    }
  }, [selectedFile, previewUrl, showToast, fetchProfile]);

  // Remove avatar
  const handleRemoveAvatar = useCallback(async () => {
    try {
      const response = await api.delete("/api/profile/avatar");
      if (response.data.success) {
        setUser(response.data.user);
        setAvatarError(false);
        showToast("Xóa ảnh đại diện thành công!", "success");
        
        // Refresh profile and dashboard
        fetchProfile(true);
        window.dispatchEvent(new Event("storage"));
        triggerRefresh("profile");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Lỗi xóa ảnh", "error");
    }
  }, [showToast, fetchProfile]);

  // Get avatar URL - memoized
  const getAvatarUrl = useCallback(() => {
    if (previewUrl) return previewUrl;
    if (user?.avatar && !avatarError) {
      const avatarPath = user.avatar;
      if (avatarPath.startsWith("http")) return avatarPath;
      return `https://workshift-o5sm.onrender.com${avatarPath}`;
    }
    return null;
  }, [previewUrl, user?.avatar, avatarError]);

  // Get initials - memoized
  const getInitials = useCallback(() => {
    const name = user?.full_name || "User";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.full_name]);

  // Memoized values
  const hasAvatar = useMemo(() => user?.avatar && !avatarError, [user?.avatar, avatarError]);
  
  const avatarUrl = useMemo(() => getAvatarUrl(), [getAvatarUrl]);
  const initials = useMemo(() => getInitials(), [getInitials]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (loading && !refreshing) {
    return <div className="profile-loading">⏳ Đang tải...</div>;
  }

  return (
    <div className="profile-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      
      {refreshing && <div className="refreshing-overlay">🔄 Đang cập nhật...</div>}

      <div className="profile-container">
        <h1 className="profile-title">👤 Hồ sơ cá nhân</h1>

        <AvatarSection
          user={user}
          hasAvatar={hasAvatar}
          previewUrl={previewUrl}
          uploading={uploading}
          selectedFile={selectedFile}
          getAvatarUrl={() => avatarUrl}
          getInitials={() => initials}
          onFileChange={handleFileChange}
          onUpload={handleUploadAvatar}
          onRemove={handleRemoveAvatar}
        />

        <ProfileInfo
          user={user}
          editing={editing}
          formData={formData}
          onEdit={() => setEditing(true)}
          onCancel={() => setEditing(false)}
          onChange={handleFormChange}
          onSubmit={handleUpdateProfile}
        />

        <PasswordChange
          changingPassword={changingPassword}
          passwordData={passwordData}
          onToggle={() => setChangingPassword(!changingPassword)}
          onChange={handlePasswordChange}
          onSubmit={handleChangePassword}
        />
      </div>
    </div>
  );
}

export default Profile;