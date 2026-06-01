import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { FaBars, FaTimes } from "react-icons/fa";

function Layout() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div style={styles.container}>
      <Sidebar isOpen={isOpen} isMobile={isMobile} onToggle={toggleSidebar} />
      
      <div
        style={{
          ...styles.content,
          marginLeft: isOpen ? (isMobile ? 0 : "260px") : (isMobile ? 0 : "70px"),
        }}
      >
        <div style={styles.header}>
          <button onClick={toggleSidebar} style={styles.toggleBtn}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div style={styles.headerTitle}>WORKSHIFT</div>
        </div>
        <div style={styles.main}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
  },
  content: {
    flex: 1,
    transition: "0.3s",
    backgroundColor: "#f7f9fc",
  },
  header: {
    backgroundColor: "white",
    padding: "10px 18px",
    boxShadow: "0 1px 0 rgba(15,23,42,0.08)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },
  toggleBtn: {
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    fontSize: "20px",
    cursor: "pointer",
    color: "#2563eb",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
  },
  main: {
    padding: "18px",
  },
};

export default Layout;
