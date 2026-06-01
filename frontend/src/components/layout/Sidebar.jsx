import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaUser,
  FaSignOutAlt,
  FaPlusCircle,
  FaCalendarAlt,
  FaBriefcase,
  FaMoneyBillWave,
  FaBars,
  FaTimes,
} from "react-icons/fa";

const menuItems = [
  { path: "/dashboard", name: "Trang chủ", icon: <FaHome /> },
  { path: "/shift", name: "Đăng ký ca làm", icon: <FaPlusCircle /> },
  { path: "/attendance", name: "Lịch làm việc", icon: <FaCalendarAlt /> },
  { path: "/salary", name: "Lương", icon: <FaMoneyBillWave /> },
  { path: "/workplace-register", name: "Đăng ký chỗ làm", icon: <FaBriefcase /> },
  { path: "/profile", name: "Hồ sơ", icon: <FaUser /> },
];

function Sidebar({ isOpen, isMobile, onToggle }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirm = window.confirm("Bạn có chắc muốn đăng xuất?");
    if (!confirm) return;

    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      {/* Nút toggle menu bên ngoài - hiển thị khi menu đóng */}
      {!isOpen && (
        <button onClick={onToggle} style={styles.toggleBtnOuter}>
          <FaBars />
        </button>
      )}

      <div
        style={{
          ...styles.sidebar,
          width: isOpen ? "260px" : "70px",
          transform: isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        <div style={styles.logo}>
          <div style={styles.logoContent}>
            <h2 style={{ fontSize: isOpen ? "22px" : "18px", margin: 0 }}>
              {isOpen ? "WORKSHIFT" : "WS"}
            </h2>
            {/* Nút đóng bên trong sidebar */}
            {isOpen && (
              <button onClick={onToggle} style={styles.closeBtn}>
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        <div style={styles.menu}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={!isOpen ? item.name : ""}
              style={({ isActive }) => ({
                ...styles.menuItem,
                backgroundColor: isActive ? "#3b82f6" : "transparent",
                justifyContent: isOpen ? "flex-start" : "center",
                borderLeft: isActive ? "3px solid #fff" : "3px solid transparent",
              })}
            >
              <span style={styles.icon}>{item.icon}</span>
              {isOpen && <span>{item.name}</span>}
            </NavLink>
          ))}
        </div>

        <div style={styles.logout}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <FaSignOutAlt />
            {isOpen && "Đăng xuất"}
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  sidebar: {
    background: "linear-gradient(180deg, #1e293b, #0f172a)",
    color: "white",
    height: "100vh",
    position: "fixed",
    left: 0,
    top: 0,
    zIndex: 100,
    boxShadow: "2px 0 20px rgba(0,0,0,0.2)",
    transition: "0.3s",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  logo: {
    padding: "22px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    textAlign: "center",
    fontWeight: "700",
  },
  logoContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: "white",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "0.2s",
  },
  toggleBtnOuter: {
    position: "fixed",
    top: "15px",
    left: "15px",
    zIndex: 101,
    background: "#3b82f6",
    border: "none",
    color: "white",
    cursor: "pointer",
    padding: "12px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    transition: "0.2s",
  },
  menu: {
    flex: 1,
    padding: "20px 10px",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px",
    color: "white",
    textDecoration: "none",
    borderRadius: "12px",
    marginBottom: "10px",
    fontSize: "15px",
    transition: "0.2s",
    cursor: "pointer",
  },
  icon: {
    fontSize: "20px",
    minWidth: "24px",
    textAlign: "center",
  },
  logout: {
    padding: "20px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  logoutBtn: {
    width: "100%",
    padding: "12px",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: "600",
    transition: "0.2s",
  },
};

export default Sidebar;