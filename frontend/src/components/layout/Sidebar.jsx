import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

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
    backgroundColor: "#f5f7fa",
  },
  main: {
    padding: "20px",
  },
};

export default Layout;