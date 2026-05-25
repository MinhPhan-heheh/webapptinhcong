import React from "react";

import {
  FaBars,
  FaUserCircle,
} from "react-icons/fa";

function Header({
  toggleSidebar,
}) {

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  return (
    <header style={styles.header}>

      {/* LEFT */}
      <div style={styles.left}>

        <button
          style={styles.menuBtn}
          onClick={toggleSidebar}
        >
          <FaBars />
        </button>

        <h2 style={styles.logo}>
          WORKSHIFT
        </h2>

      </div>

      {/* RIGHT */}
      <div style={styles.right}>

        <div style={styles.userBox}>

          <FaUserCircle
            style={styles.avatar}
          />

          <div>

            <div style={styles.userName}>
              {
                user?.full_name ||
                "User"
              }
            </div>

            <div style={styles.userRole}>
              Nhân viên
            </div>

          </div>

        </div>

      </div>

    </header>
  );
}

const styles = {

  header: {
    height: "70px",

    background: "white",

    display: "flex",

    alignItems: "center",

    justifyContent:
      "space-between",

    padding: "0 20px",

    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",

    position: "sticky",

    top: 0,

    zIndex: 50,
  },

  left: {
    display: "flex",

    alignItems: "center",

    gap: 15,
  },

  menuBtn: {
    width: 45,

    height: 45,

    border: "none",

    borderRadius: 12,

    background: "#eff6ff",

    color: "#2563eb",

    cursor: "pointer",

    fontSize: 18,
  },

  logo: {
    margin: 0,

    fontSize: 24,

    color: "#0f172a",

    fontWeight: 700,
  },

  right: {
    display: "flex",

    alignItems: "center",
  },

  userBox: {
    display: "flex",

    alignItems: "center",

    gap: 12,

    background: "#f8fafc",

    padding: "8px 14px",

    borderRadius: 14,
  },

  avatar: {
    fontSize: 38,

    color: "#2563eb",
  },

  userName: {
    fontWeight: 700,

    color: "#0f172a",

    fontSize: 15,
  },

  userRole: {
    fontSize: 13,

    color: "#64748b",
  },
};

export default Header;