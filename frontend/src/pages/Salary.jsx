import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
  useDeferredValue,
  startTransition,
} from "react";

import api from "../services/api";
import "../styles/Salary.css";

// Constants
const TOAST_DURATION = 3000;
const COLORS = ["#28a745", "#ff9800", "#dc3545", "#007bff", "#6f42c1", "#20c997", "#fd7e14", "#e83e8c"];
const CACHE_KEY = "salary_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Utility functions
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "0₫";
  return Number(amount).toLocaleString("vi-VN") + "₫";
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN");
};

// Cache manager
const cacheManager = {
  get: (key) => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (e) {
      console.error("Cache read error:", e);
    }
    return null;
  },
  set: (key, data) => {
    try {
      localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error("Cache write error:", e);
    }
  },
  clear: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Memoized Components
const SummaryCard = memo(({ icon, label, value }) => (
  <div className="summary-card">
    <div className="summary-icon">{icon}</div>
    <div className="summary-info">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  </div>
));

const LoadingSkeleton = memo(() => (
  <div className="loading-skeleton">
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
    <div className="skeleton-table"></div>
  </div>
));

const Toast = memo(({ show, message, type }) => {
  if (!show) return null;
  return <div className={`toast-notification ${type}`}>{message}</div>;
});

const SalaryTableRow = memo(({ item }) => (
  <tr className={item.holiday_type === "holiday" ? "holiday-row" : ""}>
    <td>{formatDate(item.shift_date)}</td>
    <td>{item.workplace_name}</td>
    <td>{item.start_time} - {item.end_time}</td>
    <td>{item.work_hours}h</td>
    <td>{formatCurrency(item.base_salary)}/h</td>
    <td>{item.holiday_rate === 1 ? "" : `x${item.holiday_rate}`}</td>
    <td className="salary-amount">{formatCurrency(item.shift_salary)}</td>
  </tr>
));

const WorkplaceCard = memo(({ item }) => (
  <div className="workplace-salary-card">
    <div className="workplace-name">🏢 {item.workplace_name}</div>
    <div className="workplace-stats">
      <div className="stat">📋 {item.total_shifts} ca</div>
      <div className="stat">⏰ {item.total_hours} giờ</div>
      <div className="stat salary">💰 {formatCurrency(item.total_salary)}</div>
    </div>
  </div>
));

const BarChartItem = memo(({ item, total, color }) => {
  const percent = total > 0 ? (item.total_salary / total) * 100 : 0;
  return (
    <div className="bar-chart-item">
      <div className="bar-chart-label">
        <span className="bar-chart-name">{item.workplace_name}</span>
        <span className="bar-chart-value">{formatCurrency(item.total_salary)}</span>
      </div>
      <div className="bar-chart-bar-wrapper">
        <div 
          className="bar-chart-bar"
          style={{ width: `${percent}%`, backgroundColor: color }}
        >
          <span className="bar-chart-percent">{percent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
});

function Salary() {
  // State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWorkplace, setSelectedWorkplace] = useState("all");
  const [workplaceFilter, setWorkplaceFilter] = useState("all");
  const [chartFilter, setChartFilter] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [salaryData, setSalaryData] = useState(null);
  const [allWorkplaces, setAllWorkplaces] = useState([]);
  const [workplaceSalaryData, setWorkplaceSalaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("salary_view_mode") || "detail";
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  
  // Refs for abort controllers
  const abortControllerRef = useRef(null);
  const cacheKey = useMemo(() => `${selectedYear}_${selectedMonth}`, [selectedYear, selectedMonth]);
  
  // Deferred values for heavy computations
  const deferredSelectedWeek = useDeferredValue(selectedWeek);
  const deferredSelectedWorkplace = useDeferredValue(selectedWorkplace);
  const deferredWorkplaceFilter = useDeferredValue(workplaceFilter);
  const deferredChartFilter = useDeferredValue(chartFilter);

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Save view mode
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem("salary_view_mode", mode);
  }, []);

  // Years and months - memoized
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  const months = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], []);

  // Get weeks in month - optimized with useCallback
  const getWeeksInMonth = useCallback((year, month) => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const lastDate = lastDayOfMonth.getDate();
    let currentDate = new Date(firstDayOfMonth);
    let currentDayOfWeek = currentDate.getDay();
    let startOfFirstWeek = new Date(currentDate);

    if (currentDayOfWeek === 0) {
      startOfFirstWeek.setDate(currentDate.getDate() - 6);
    } else if (currentDayOfWeek !== 1) {
      startOfFirstWeek.setDate(currentDate.getDate() - (currentDayOfWeek - 1));
    }

    const weeks = [];
    let weekStart = new Date(startOfFirstWeek);
    let weekNumber = 1;

    while (weekStart <= lastDayOfMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      let startDay = weekStart.getDate();
      let endDay = weekEnd.getDate();
      let startMonth = weekStart.getMonth() + 1;
      let endMonth = weekEnd.getMonth() + 1;

      if (startMonth < month) {
        startDay = 1;
        startMonth = month;
      }
      if (endMonth > month) {
        endDay = lastDate;
        endMonth = month;
      }

      if (startDay <= lastDate && startMonth === month) {
        let label = `Tuần ${weekNumber}`;
        if (startDay === endDay) {
          label += ` (${startDay}/${month})`;
        } else {
          label += ` (${startDay}/${month} - ${endDay}/${month})`;
        }
        weeks.push({
          week: weekNumber,
          label,
          startDay,
          endDay,
        });
      }
      weekStart.setDate(weekStart.getDate() + 7);
      weekNumber++;
    }
    return weeks;
  }, []);

  const weeksInMonth = useMemo(() => {
    return getWeeksInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, getWeeksInMonth]);

  // Fetch workplaces - optimized with caching
  const fetchWorkplaces = useCallback(async () => {
    const cacheData = cacheManager.get("workplaces");
    if (cacheData) {
      setAllWorkplaces(cacheData);
      return;
    }
    
    try {
      const response = await api.get("/api/workplaces/my");
      if (response.data.success) {
        const workplaces = response.data.workplaces || [];
        setAllWorkplaces(workplaces);
        cacheManager.set("workplaces", workplaces);
      }
    } catch (error) {
      console.error("Lỗi fetch workplaces:", error);
      if (error.response?.status !== 401) {
        showToast("Không thể tải danh sách chỗ làm", "error");
      }
    }
  }, [showToast]);

  // Fetch salary data - optimized with caching and abort
  const loadData = useCallback(async (isRefresh = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Check cache
    if (!isRefresh) {
      const cachedSalary = cacheManager.get(`salary_${cacheKey}`);
      const cachedWorkplace = cacheManager.get(`workplace_salary_${cacheKey}`);
      if (cachedSalary && cachedWorkplace) {
        setSalaryData(cachedSalary);
        setWorkplaceSalaryData(cachedWorkplace);
        setLoading(false);
        return;
      }
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      startTransition(() => {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      });

      const [salaryRes, workplaceRes] = await Promise.all([
        api.get(`/api/salary/calculate?year=${selectedYear}&month=${selectedMonth}`, {
          signal: controller.signal
        }),
        api.get(`/api/salary/by-workplace?year=${selectedYear}&month=${selectedMonth}`, {
          signal: controller.signal
        }),
      ]);

      if (salaryRes.data.success) {
        setSalaryData(salaryRes.data);
        cacheManager.set(`salary_${cacheKey}`, salaryRes.data);
      }
      if (workplaceRes.data.success) {
        const details = workplaceRes.data.details || [];
        setWorkplaceSalaryData(details);
        cacheManager.set(`workplace_salary_${cacheKey}`, details);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Lỗi load data:", error);
        if (error.response?.status !== 401) {
          showToast("Không thể tải dữ liệu lương", "error");
        }
      }
    } finally {
      startTransition(() => {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      });
    }
  }, [selectedYear, selectedMonth, cacheKey, showToast]);

  // ==================== INITIAL LOAD & REFRESH LISTENER ====================
  useEffect(() => {
    // Force refresh khi component mount (bỏ qua cache)
    loadData(true);
    fetchWorkplaces();
    
    // Lắng nghe sự kiện refresh từ App (khi chuyển trang)
    const handleRefresh = (event) => {
      const { dataType } = event.detail || {};
      if (dataType === "all" || dataType === "salary") {
        cacheManager.clear();
        loadData(true);
        fetchWorkplaces();
      }
    };
    
    window.addEventListener("app-refresh", handleRefresh);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener("app-refresh", handleRefresh);
    };
  }, []); // Chạy 1 lần khi mount

  // Auto refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        loadData(true);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData, loading, refreshing]);

  // Filtered data - optimized with useMemo and deferred values
  const filteredSalaryData = useMemo(() => {
    if (!salaryData) return null;

    let details = salaryData.details || [];

    if (deferredSelectedWeek !== "all") {
      const weekInfo = weeksInMonth.find((w) => w.week === Number(deferredSelectedWeek));
      if (weekInfo) {
        details = details.filter((item) => {
          const day = new Date(item.shift_date).getDate();
          return day >= weekInfo.startDay && day <= weekInfo.endDay;
        });
      }
    }

    if (deferredSelectedWorkplace !== "all") {
      details = details.filter((item) => item.workplace_id === Number(deferredSelectedWorkplace));
    }

    // Calculate totals efficiently
    let totalSalary = 0;
    let totalHours = 0;
    for (const item of details) {
      totalSalary += Number(item.shift_salary || 0);
      totalHours += Number(item.work_hours || 0);
    }

    return {
      ...salaryData,
      details,
      total_salary: totalSalary,
      total_hours: totalHours,
      total_shifts: details.length,
    };
  }, [salaryData, deferredSelectedWeek, deferredSelectedWorkplace, weeksInMonth]);

  const filteredWorkplaceData = useMemo(() => {
    let data = [...workplaceSalaryData];
    if (deferredWorkplaceFilter !== "all") {
      data = data.filter((item) => item.workplace_id === Number(deferredWorkplaceFilter));
    }
    return data;
  }, [workplaceSalaryData, deferredWorkplaceFilter]);

  const chartData = useMemo(() => {
    let data = [...workplaceSalaryData];
    if (deferredChartFilter !== "all") {
      data = data.filter((item) => item.workplace_id === Number(deferredChartFilter));
    }
    // Sort by total salary descending for better visualization
    return data.sort((a, b) => b.total_salary - a.total_salary);
  }, [workplaceSalaryData, deferredChartFilter]);

  // Total values - computed from filtered data
  const totalSalary = filteredSalaryData?.total_salary || 0;
  const totalHours = filteredSalaryData?.total_hours || 0;
  const totalShifts = filteredSalaryData?.total_shifts || 0;
  
  const chartTotal = useMemo(() => {
    let sum = 0;
    for (const item of chartData) {
      sum += Number(item.total_salary || 0);
    }
    return sum;
  }, [chartData]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <div className="salary-page">
        <div className="salary-header">
          <h1 className="title">💰 Quản lý lương</h1>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="salary-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      
      {refreshing && <div className="refreshing-overlay">🔄 Đang cập nhật...</div>}

      <div className="salary-header">
        <h1 className="title">💰 Quản lý lương</h1>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>NĂM</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map((year) => (
              <option key={year} value={year}>Năm {year}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>THÁNG</label>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              setSelectedWeek("all");
            }}
          >
            {months.map((month) => (
              <option key={month} value={month}>Tháng {month}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>📅 TUẦN</label>
          <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
            <option value="all">📋 Tất cả</option>
            {weeksInMonth.map((week) => (
              <option key={week.week} value={week.week}>{week.label}</option>
            ))}
          </select>
        </div>

        {viewMode === "detail" && (
          <div className="filter-group">
            <label>🏢 CHỖ LÀM</label>
            <select value={selectedWorkplace} onChange={(e) => setSelectedWorkplace(e.target.value)}>
              <option value="all">📋 Tất cả</option>
              {allWorkplaces.map((w) => (
                <option key={w.id} value={w.id}>🏢 {w.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab View */}
      <div className="view-toggle">
        <button
          className={`view-btn ${viewMode === "detail" ? "active" : ""}`}
          onClick={() => handleViewModeChange("detail")}
        >
          📋 Chi tiết
        </button>
        <button
          className={`view-btn ${viewMode === "workplace" ? "active" : ""}`}
          onClick={() => handleViewModeChange("workplace")}
        >
          🏢 Theo chỗ làm
        </button>
        <button
          className={`view-btn ${viewMode === "chart" ? "active" : ""}`}
          onClick={() => handleViewModeChange("chart")}
        >
          📊 Biểu đồ
        </button>
      </div>

      {/* Detail View */}
      {viewMode === "detail" && filteredSalaryData && (
        <>
          <div className="summary-cards">
            <SummaryCard icon="💰" label="Tổng lương" value={formatCurrency(totalSalary)} />
            <SummaryCard icon="⏰" label="Tổng giờ" value={`${totalHours} giờ`} />
            <SummaryCard icon="📋" label="Tổng ca" value={`${totalShifts} ca`} />
          </div>

          <div className="salary-table-container">
            <h3 className="table-title">📋 Chi tiết ca làm</h3>
            <div className="table-wrapper">
              <table className="salary-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Chỗ làm</th>
                    <th>Ca làm</th>
                    <th>Giờ</th>
                    <th>Đơn giá</th>
                    <th>Hệ số</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaryData.details.length > 0 ? (
                    filteredSalaryData.details.map((item, idx) => (
                      <SalaryTableRow key={idx} item={item} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="empty-data">📭 Không có dữ liệu ca làm</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Workplace View */}
      {viewMode === "workplace" && (
        <div className="workplace-list">
          {filteredWorkplaceData.length > 0 ? (
            filteredWorkplaceData.map((item, idx) => (
              <WorkplaceCard key={idx} item={item} />
            ))
          ) : (
            <div className="empty-data">📭 Không có dữ liệu chỗ làm</div>
          )}
        </div>
      )}

      {/* Chart View */}
      {viewMode === "chart" && (
        <div className="chart-container">
          <div className="chart-title-section">
            <h3>📊 Biểu đồ phân bổ lương theo chỗ làm</h3>
            {chartFilter !== "all" && (
              <button className="chart-reset-btn" onClick={() => setChartFilter("all")}>
                🔄 Xem tất cả
              </button>
            )}
          </div>
          
          {chartData.length > 0 ? (
            <div className="chart-wrapper">
              <div className="bar-chart">
                {chartData.map((item, idx) => (
                  <BarChartItem 
                    key={idx} 
                    item={item} 
                    total={chartTotal}
                    color={COLORS[idx % COLORS.length]}
                  />
                ))}
              </div>

              <div className="pie-legend">
                {chartData.map((item, idx) => {
                  const percent = chartTotal > 0 ? (item.total_salary / chartTotal) * 100 : 0;
                  return (
                    <div key={idx} className="legend-item">
                      <div className="legend-color" style={{ background: COLORS[idx % COLORS.length] }}></div>
                      <div className="legend-info">
                        <span className="legend-name">{item.workplace_name}</span>
                        <span className="legend-value">{formatCurrency(item.total_salary)}</span>
                        <span className="legend-percent">({percent.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-data">📭 Không có dữ liệu để hiển thị biểu đồ</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Salary;