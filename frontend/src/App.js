import "./App.css";
import React, { Suspense, lazy, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { initRefreshOnRouteChange } from "./services/api";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

const routeLoaders = {
  login: () => import("./pages/auth/Login"),
  register: () => import("./pages/auth/Register"),
  forgotPassword: () => import("./pages/auth/ForgotPassword"),
  dashboard: () => import("./pages/Dashboard"),
  shift: () => import("./pages/Shift"),
  workplaceRegister: () => import("./pages/WorkplaceRegister"),
  attendance: () => import("./pages/Attendance"),
  salary: () => import("./pages/Salary"),
  profile: () => import("./pages/Profile"),
};

const Login = lazy(routeLoaders.login);
const Register = lazy(routeLoaders.register);
const ForgotPassword = lazy(routeLoaders.forgotPassword);

const Dashboard = lazy(routeLoaders.dashboard);
const Shift = lazy(routeLoaders.shift);
const WorkplaceRegister = lazy(routeLoaders.workplaceRegister);
const Attendance = lazy(routeLoaders.attendance);
const Salary = lazy(routeLoaders.salary);
const Profile = lazy(routeLoaders.profile);

const preloadPageChunks = () => {
  const preload = () => {
    Object.values(routeLoaders).forEach((loadRoute) => {
      loadRoute().catch(() => {});
    });
  };

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(preload, { timeout: 2500 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timerId = window.setTimeout(preload, 800);
  return () => window.clearTimeout(timerId);
};

function App() {
  useEffect(() => {
    const cleanupRefresh = initRefreshOnRouteChange();
    const cleanupPreload = preloadPageChunks();

    return () => {
      cleanupRefresh();
      cleanupPreload();
    };
  }, []);

  return (
    <HashRouter>
      <Suspense fallback={<div className="app-loading">Dang tai...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/shift" element={<Shift />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/salary" element={<Salary />} />
              <Route path="/workplace-register" element={<WorkplaceRegister />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
