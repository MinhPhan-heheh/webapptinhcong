import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import "../styles/Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "",
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({
      show: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: "",
        type: "",
      });
    }, 2000);
  }, []);

  // ================= FETCH PROFILE =================

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      // ĐÃ SỬA: thêm /api và dấu / ở cuối
      const response = await api.get("/api/profile/");

      if (response.data.success) {
        setUser(response.data.user);

        setFormData({
          full_name: response.data.user.full_name || "",
          phone: response.data.user.phone || "",
        });

        setAvatarError(false);
      }
    } catch (error) {
      console.error(
        "Lỗi fetch profile:",
        error.response?.data || error.message
      );

      showToast("Không thể tải thông tin hồ sơ", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ================= UPDATE PROFILE =================

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    try {
      // ĐÃ SỬA: thêm /api và dấu / ở cuối
      const response = await api.put("/api/profile/", formData);

      if (response.data.success) {
        setUser(response.data.user);
        setEditing(false);

        showToast("Cập nhật hồ sơ thành công!");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Lỗi cập nhật",
        "error"
      );
    }
  };

  // ================= CHANGE PASSWORD =================

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast("Mật khẩu xác nhận không khớp", "error");
      return;
    }

    if (passwordData.new_password.length < 6) {
      showToast(
        "Mật khẩu mới phải có ít nhất 6 ký tự",
        "error"
      );
      return;
    }

    try {
      // ĐÃ SỬA: thêm /api
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

        showToast("Đổi mật khẩu thành công!");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Lỗi đổi mật khẩu",
        "error"
      );
    }
  };

  // ================= HANDLE FILE =================

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Ảnh không được vượt quá 2MB", "error");
        return;
      }

      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        showToast(
          "Chỉ chấp nhận file ảnh (jpg, png, gif, webp)",
          "error"
        );
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAvatarError(false);
    }
  };

  // ================= UPLOAD AVATAR =================

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;

    setUploading(true);

    const formDataUpload = new FormData();
    formDataUpload.append("avatar", selectedFile);

    try {
      // ĐÃ SỬA: thêm /api
      const response = await api.post("/api/profile/avatar", formDataUpload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setUser(response.data.user);
        setSelectedFile(null);
        setPreviewUrl(null);
        setAvatarError(false);

        showToast("Cập nhật ảnh đại diện thành công!");

        fetchProfile();
      }
    } catch (error) {
      console.error(
        "Upload error:",
        error.response?.data || error.message
      );

      showToast(
        error.response?.data?.message || "Lỗi upload ảnh",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  // ================= REMOVE AVATAR =================

  const handleRemoveAvatar = async () => {
    try {
      // ĐÃ SỬA: thêm /api
      const response = await api.delete("/api/profile/avatar");

      if (response.data.success) {
        setUser(response.data.user);
        setAvatarError(false);

        showToast("Xóa ảnh đại diện thành công!");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Lỗi xóa ảnh",
        "error"
      );
    }
  };

  // ================= AVATAR URL =================

  const getAvatarUrl = () => {
    if (previewUrl) return previewUrl;

    if (user?.avatar && !avatarError) {
      let avatarPath = user.avatar;
      // Nếu avatar đã có URL đầy đủ thì dùng luôn
      if (avatarPath.startsWith("http")) {
        return avatarPath;
      }
      // Nếu là đường dẫn tương đối, thêm base URL
      return `https://workshift-o5sm.onrender.com${avatarPath}`;
    }
    return null;
  };

  // ================= INITIALS =================

  const getInitials = () => {
    const name = user?.full_name || "User";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasAvatar = user?.avatar && !avatarError;

  if (loading) {
    return (
      <div className="profile-loading">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="profile-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === "success" ? "✅ " : "❌ "}
          {toast.message}
        </div>
      )}

      <div className="profile-container">
        <h1 className="profile-title">
          👤 Hồ sơ cá nhân
        </h1>

        {/* ================= AVATAR ================= */}

        <div className="avatar-section">
          <div className="avatar-wrapper">
            {hasAvatar || previewUrl ? (
              <img
                src={getAvatarUrl()}
                alt="Avatar"
                className="profile-avatar"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="profile-avatar-default">
                {getInitials()}
              </div>
            )}

            <label
              className="avatar-upload-label"
              title="Chọn ảnh đại diện"
            >
              📷
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {selectedFile && (
            <button
              className="avatar-btn save-avatar-btn"
              onClick={handleUploadAvatar}
              disabled={uploading}
            >
              {uploading
                ? "⏳ Đang tải..."
                : "💾 Lưu ảnh"}
            </button>
          )}

          {user?.avatar && !selectedFile && (
            <button
              className="avatar-btn remove-avatar-btn"
              onClick={handleRemoveAvatar}
            >
              🗑️ Xóa ảnh
            </button>
          )}

          <div className="avatar-note">
            Chấp nhận file JPG, PNG, GIF
            (tối đa 2MB)
          </div>
        </div>

        {/* ================= PROFILE INFO ================= */}

        <div className="profile-info-card">
          <div className="card-header">
            <h2>📋 Thông tin cá nhân</h2>

            {!editing && (
              <button
                className="edit-btn"
                onClick={() => setEditing(true)}
              >
                ✏️ Sửa
              </button>
            )}
          </div>

          {editing ? (
            <form
              onSubmit={handleUpdateProfile}
              className="profile-form"
            >
              <div className="form-group">
                <label>Họ và tên</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      full_name: e.target.value,
                    })
                  }
                  required
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="disabled-input"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setEditing(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="save-btn"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">
                  👤 Họ và tên
                </span>
                <span className="detail-value">
                  {user?.full_name || "Chưa cập nhật"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  📧 Email
                </span>
                <span className="detail-value">
                  {user?.email}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  📞 Số điện thoại
                </span>
                <span className="detail-value">
                  {user?.phone || "Chưa cập nhật"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  ✅ Trạng thái
                </span>
                <span
                  className={`verify-status ${
                    user?.is_verified
                      ? "verified"
                      : "unverified"
                  }`}
                >
                  {user?.is_verified
                    ? "Đã xác thực"
                    : "Chưa xác thực"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  📅 Ngày tham gia
                </span>
                <span className="detail-value">
                  {user?.created_at
                    ? new Date(
                        user.created_at
                      ).toLocaleDateString("vi-VN")
                    : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ================= PASSWORD ================= */}

        <div className="profile-info-card">
          <div className="card-header">
            <h2>🔐 Đổi mật khẩu</h2>

            {!changingPassword && (
              <button
                className="edit-btn"
                onClick={() =>
                  setChangingPassword(true)
                }
              >
                ✏️ Đổi mật khẩu
              </button>
            )}
          </div>

          {changingPassword && (
            <form
              onSubmit={handleChangePassword}
              className="profile-form"
            >
              <div className="form-group">
                <label>
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={
                    passwordData.current_password
                  }
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      current_password:
                        e.target.value,
                    })
                  }
                  required
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  value={
                    passwordData.new_password
                  }
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      new_password:
                        e.target.value,
                    })
                  }
                  required
                  placeholder="Nhập mật khẩu mới"
                />
              </div>

              <div className="form-group">
                <label>
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={
                    passwordData.confirm_password
                  }
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirm_password:
                        e.target.value,
                    })
                  }
                  required
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setChangingPassword(false)
                  }
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="save-btn"
                >
                  Đổi mật khẩu
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;