import "./App.css";
import { HashRouter } from 'react-router-dom';  // Thêm dòng này

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Main pages
import Dashboard from "./pages/Dashboard";
import Shift from "./pages/Shift";
import WorkplaceRegister from "./pages/WorkplaceRegister";
import Attendance from "./pages/Attendance";
import Salary from "./pages/Salary";
import Profile from "./pages/Profile";

// Layout components
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* PROTECTED */}
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

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;