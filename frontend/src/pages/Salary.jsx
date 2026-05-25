import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";

import api from "../services/api";

import "../styles/Salary.css";

const SummaryCard = memo(({ icon, label, value }) => (
  <div className="summary-card">
    <div className="summary-icon">{icon}</div>
    <div className="summary-info">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  </div>
));

const LoadingSkeleton = () => (
  <div className="loading-skeleton">
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
    <div className="skeleton-table"></div>
  </div>
);

function Salary() {
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
  const [viewMode, setViewMode] = useState("detail");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  }, []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const colors = ['#28a745', '#ff9800', '#dc3545', '#007bff', '#6f42c1', '#20c997', '#fd7e14', '#e83e8c'];

  // Hàm lấy danh sách tuần trong tháng (chỉ tính các tuần có ngày trong tháng)
  const getWeeksInMonth = useCallback((year, month) => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const lastDate = lastDayOfMonth.getDate();
    
    // Tìm thứ 2 đầu tiên của tháng (hoặc ngày đầu tháng nếu không phải thứ 2)
    let currentDate = new Date(firstDayOfMonth);
    let currentDayOfWeek = currentDate.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7
    
    // Xác định ngày bắt đầu của tuần đầu tiên trong tháng
    let startOfFirstWeek = new Date(currentDate);
    if (currentDayOfWeek === 0) {
      // Nếu là chủ nhật, lùi về thứ 2 (ngày -6)
      startOfFirstWeek.setDate(currentDate.getDate() - 6);
    } else if (currentDayOfWeek !== 1) {
      // Nếu không phải thứ 2, lùi về thứ 2 của tuần
      startOfFirstWeek.setDate(currentDate.getDate() - (currentDayOfWeek - 1));
    }
    
    const weeks = [];
    let weekStart = new Date(startOfFirstWeek);
    let weekNumber = 1;
    
    // Tạo các tuần cho đến khi vượt quá tháng
    while (weekStart <= lastDayOfMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Tính ngày bắt đầu và kết thúc trong tháng hiện tại
      let startDay = weekStart.getDate();
      let endDay = weekEnd.getDate();
      let startMonth = weekStart.getMonth() + 1;
      let endMonth = weekEnd.getMonth() + 1;
      
      // Điều chỉnh nếu tuần bắt đầu từ tháng trước
      if (startMonth < month) {
        startDay = 1;
        startMonth = month;
      }
      
      // Điều chỉnh nếu tuần kết thúc ở tháng sau
      if (endMonth > month) {
        endDay = lastDate;
        endMonth = month;
      }
      
      // Chỉ thêm tuần nếu có ít nhất 1 ngày trong tháng hiện tại
      if (startDay <= lastDate && startMonth === month) {
        let label = `Tuần ${weekNumber}`;
        if (startDay === endDay) {
          label += ` (${startDay}/${month})`;
        } else {
          label += ` (${startDay}/${month} - ${endDay}/${month})`;
        }
        
        weeks.push({
          week: weekNumber,
          label: label,
          startDay: startDay,
          endDay: endDay,
          startDate: new Date(year, month - 1, startDay),
          endDate: new Date(year, month - 1, endDay)
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

  // Lọc dữ liệu theo tuần
  const filterDataByWeek = useCallback((data, week, workplaceId = null) => {
    if (week === "all" || !data || !data.details) return data;
    
    const weekInfo = weeksInMonth.find(w => w.week === parseInt(week));
    if (!weekInfo) return data;
    
    const startDay = weekInfo.startDay;
    const endDay = weekInfo.endDay;
    
    let filteredDetails = data.details.filter(item => {
      const day = new Date(item.shift_date).getDate();
      return day >= startDay && day <= endDay;
    });
    
    if (workplaceId && workplaceId !== "all") {
      filteredDetails = filteredDetails.filter(item => 
        item.workplace_id === parseInt(workplaceId)
      );
    }
    
    const totalSalary = filteredDetails.reduce((s, i) => s + i.shift_salary, 0);
    const totalHours = filteredDetails.reduce((s, i) => s + i.work_hours, 0);
    
    return {
      ...data,
      details: filteredDetails,
      total_salary: totalSalary,
      total_hours: totalHours,
      total_shifts: filteredDetails.length
    };
  }, [weeksInMonth]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const fetchWorkplaces = useCallback(async () => {
    try {
      const response = await api.get("/workplaces/my");
      if (response.data.success) {
        setAllWorkplaces(response.data.workplaces || []);
      }
    } catch (error) {
      console.error("Lỗi fetchWorkplaces:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salaryRes, workplaceRes] = await Promise.all([
        api.get(`/salary/calculate?year=${selectedYear}&month=${selectedMonth}`),
        api.get(`/salary/by-workplace?year=${selectedYear}&month=${selectedMonth}`)
      ]);

      if (salaryRes.data.success) {
        setSalaryData(salaryRes.data);
      }
      
      if (workplaceRes.data.success) {
        setWorkplaceSalaryData(workplaceRes.data.details || []);
      }
    } catch (error) {
      console.error("Lỗi load data:", error);
      showToast("Không thể tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, showToast]);

  useEffect(() => {
    loadData();
    fetchWorkplaces();
  }, [loadData, fetchWorkplaces]);

  // Áp dụng lọc theo tuần và chỗ làm
  const filteredSalaryData = useMemo(() => {
    let data = salaryData;
    if (selectedWeek !== "all") {
      data = filterDataByWeek(salaryData, selectedWeek, selectedWorkplace);
    } else if (selectedWorkplace !== "all" && data?.details) {
      const filteredDetails = data.details.filter(item => 
        item.workplace_id === parseInt(selectedWorkplace)
      );
      data = {
        ...data,
        details: filteredDetails,
        total_salary: filteredDetails.reduce((s, i) => s + i.shift_salary, 0),
        total_hours: filteredDetails.reduce((s, i) => s + i.work_hours, 0),
        total_shifts: filteredDetails.length
      };
    }
    return data;
  }, [salaryData, selectedWeek, selectedWorkplace, filterDataByWeek]);

  // Dữ liệu cho tab "Theo chỗ làm"
  const filteredWorkplaceData = useMemo(() => {
    let data = workplaceSalaryData;
    
    if (selectedWeek !== "all") {
      const weekInfo = weeksInMonth.find(w => w.week === parseInt(selectedWeek));
      if (weekInfo && salaryData?.details) {
        const startDay = weekInfo.startDay;
        const endDay = weekInfo.endDay;
        
        const filteredDetails = salaryData.details.filter(item => {
          const day = new Date(item.shift_date).getDate();
          return day >= startDay && day <= endDay;
        });
        
        const workplaceMap = new Map();
        filteredDetails.forEach(item => {
          const id = item.workplace_id;
          if (!workplaceMap.has(id)) {
            workplaceMap.set(id, {
              workplace_id: id,
              workplace_name: item.workplace_name,
              total_shifts: 0,
              total_hours: 0,
              total_salary: 0
            });
          }
          const wp = workplaceMap.get(id);
          wp.total_shifts++;
          wp.total_hours += item.work_hours;
          wp.total_salary += item.shift_salary;
        });
        data = Array.from(workplaceMap.values());
      }
    }
    
    if (workplaceFilter !== "all") {
      data = data.filter(item => item.workplace_id === parseInt(workplaceFilter));
    }
    return data;
  }, [workplaceFilter, workplaceSalaryData, selectedWeek, weeksInMonth, salaryData]);

  // Dữ liệu cho biểu đồ
  const chartData = useMemo(() => {
    let data = workplaceSalaryData;
    
    if (selectedWeek !== "all") {
      const weekInfo = weeksInMonth.find(w => w.week === parseInt(selectedWeek));
      if (weekInfo && salaryData?.details) {
        const startDay = weekInfo.startDay;
        const endDay = weekInfo.endDay;
        
        const filteredDetails = salaryData.details.filter(item => {
          const day = new Date(item.shift_date).getDate();
          return day >= startDay && day <= endDay;
        });
        
        const workplaceMap = new Map();
        filteredDetails.forEach(item => {
          const id = item.workplace_id;
          if (!workplaceMap.has(id)) {
            workplaceMap.set(id, {
              workplace_id: id,
              workplace_name: item.workplace_name,
              total_shifts: 0,
              total_hours: 0,
              total_salary: 0
            });
          }
          const wp = workplaceMap.get(id);
          wp.total_shifts++;
          wp.total_hours += item.work_hours;
          wp.total_salary += item.shift_salary;
        });
        data = Array.from(workplaceMap.values());
      }
    }
    
    if (chartFilter !== "all") {
      data = data.filter(item => item.workplace_id === parseInt(chartFilter));
    }
    return data;
  }, [chartFilter, workplaceSalaryData, selectedWeek, weeksInMonth, salaryData]);

  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return "0₫";
    return Number(amount).toLocaleString("vi-VN") + "₫";
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN");
  }, []);

  const currentWeekInfo = useMemo(() => {
    if (selectedWeek !== "all") {
      return weeksInMonth.find(w => w.week === parseInt(selectedWeek));
    }
    return null;
  }, [selectedWeek, weeksInMonth]);

  const totalSalary = filteredSalaryData?.total_salary || 0;
  const totalHours = filteredSalaryData?.total_hours || 0;
  const totalShifts = filteredSalaryData?.total_shifts || 0;

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    if (mode === "detail") setSelectedWorkplace("all");
    if (mode === "workplace") setWorkplaceFilter("all");
    if (mode === "chart") setChartFilter("all");
  }, []);

  if (loading) {
    return (
      <div className="salary-page">
        <div className="salary-header">
          <h1 className="title">💰 Quản lý lương</h1>
        </div>
        <div className="skeleton-filter-bar"></div>
        <div className="skeleton-view-toggle"></div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="salary-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === "error" ? "❌ " : "✅ "}
          {toast.message}
        </div>
      )}

      <div className="salary-header">
        <h1 className="title">💰 Quản lý lương</h1>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>NĂM</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map(year => <option key={year} value={year}>Năm {year}</option>)}
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
            {months.map(month => <option key={month} value={month}>Tháng {month}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>📅 TUẦN</label>
          <select 
            value={selectedWeek} 
            onChange={(e) => {
              setSelectedWeek(e.target.value);
              setSelectedWorkplace("all");
              setWorkplaceFilter("all");
              setChartFilter("all");
            }}
          >
            <option value="all">📋 Tất cả các tuần</option>
            {weeksInMonth.map(week => (
              <option key={week.week} value={week.week}>{week.label}</option>
            ))}
          </select>
        </div>

        {viewMode === "detail" && (
          <div className="filter-group">
            <label>🏢 CHỖ LÀM</label>
            <select 
              value={selectedWorkplace} 
              onChange={(e) => setSelectedWorkplace(e.target.value)}
            >
              <option value="all">📋 Tất cả</option>
              {allWorkplaces.map(w => <option key={w.id} value={w.id}>🏢 {w.name}</option>)}
            </select>
          </div>
        )}

        {viewMode === "workplace" && (
          <div className="filter-group">
            <label>🏢 LỌC</label>
            <select 
              value={workplaceFilter} 
              onChange={(e) => setWorkplaceFilter(e.target.value)}
            >
              <option value="all">📋 Tất cả</option>
              {allWorkplaces.map(w => <option key={w.id} value={w.id}>🏢 {w.name}</option>)}
            </select>
          </div>
        )}

        {viewMode === "chart" && (
          <div className="filter-group">
            <label>📊 LỌC</label>
            <select 
              value={chartFilter} 
              onChange={(e) => setChartFilter(e.target.value)}
            >
              <option value="all">📋 Tất cả</option>
              {allWorkplaces.map(w => <option key={w.id} value={w.id}>🏢 {w.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="view-toggle">
        <button className={`view-btn ${viewMode === "detail" ? "active" : ""}`} onClick={() => handleViewModeChange("detail")}>
          📋 Chi tiết ca làm
        </button>
        <button className={`view-btn ${viewMode === "workplace" ? "active" : ""}`} onClick={() => handleViewModeChange("workplace")}>
          🏢 Theo chỗ làm
        </button>
        <button className={`view-btn ${viewMode === "chart" ? "active" : ""}`} onClick={() => handleViewModeChange("chart")}>
          📊 Biểu đồ lương
        </button>
      </div>

      <div className="content-wrapper">
        {viewMode === "detail" && (
          <div className="salary-detail">
            <div className="summary-cards">
              <SummaryCard icon="💰" label={`Tổng lương ${selectedWeek !== "all" ? `${currentWeekInfo?.label}` : `T${selectedMonth}/${selectedYear}`}`} value={formatCurrency(totalSalary)} />
              <SummaryCard icon="⏰" label="Tổng giờ làm" value={`${totalHours} giờ`} />
              <SummaryCard icon="📋" label="Tổng số ca" value={`${totalShifts} ca`} />
            </div>

            <div className="salary-table-container">
              <h3 className="table-title">
                📋 Chi tiết ca làm
                {selectedWeek !== "all" && currentWeekInfo && (
                  <span className="filter-badge">
                    {currentWeekInfo.label} - Tổng {totalShifts} ca, {totalHours} giờ
                  </span>
                )}
                {selectedWeek === "all" && selectedWorkplace !== "all" && (
                  <span className="filter-badge">
                    {allWorkplaces.find(w => w.id === parseInt(selectedWorkplace))?.name} - Tổng {totalShifts} ca
                  </span>
                )}
              </h3>
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
                    {filteredSalaryData?.details?.length > 0 ? (
                      filteredSalaryData.details.map((item, idx) => (
                        <tr key={idx} className={item.holiday_type === 'holiday' ? 'holiday-row' : ''}>
                          <td>{formatDate(item.shift_date)}</td>
                          <td>{item.workplace_name}</td>
                          <td>{item.start_time} - {item.end_time}</td>
                          <td>{item.work_hours}h</td>
                          <td>{formatCurrency(item.base_salary)}/h</td>
                          <td>{item.holiday_rate === 1 ? '' : `x${item.holiday_rate}`}</td>
                          <td className="salary-amount">{formatCurrency(item.shift_salary)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="empty-data">
                          Không có ca làm trong {selectedWeek !== "all" ? `tuần này` : "tháng này"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === "workplace" && (
          <div className="workplace-salary">
            <div className="summary-cards">
              <SummaryCard 
                icon="💰" 
                label="Tổng lương" 
                value={formatCurrency(filteredWorkplaceData.reduce((s, i) => s + i.total_salary, 0))} 
              />
              <SummaryCard 
                icon="⏰" 
                label="Tổng giờ" 
                value={`${filteredWorkplaceData.reduce((s, i) => s + i.total_hours, 0)} giờ`} 
              />
              <SummaryCard 
                icon="📋" 
                label="Tổng ca" 
                value={`${filteredWorkplaceData.reduce((s, i) => s + i.total_shifts, 0)} ca`} 
              />
            </div>

            <div className="workplace-list">
              <h3 className="table-title">
                🏢 Lương theo chỗ làm
                {selectedWeek !== "all" && currentWeekInfo && (
                  <span className="filter-badge">
                    {currentWeekInfo.label}
                  </span>
                )}
              </h3>
              {filteredWorkplaceData.length > 0 ? (
                filteredWorkplaceData.map((item, idx) => (
                  <div key={idx} className="workplace-salary-card">
                    <div className="workplace-name">{item.workplace_name}</div>
                    <div className="workplace-stats">
                      <div className="stat"><span>📋 {item.total_shifts} ca</span></div>
                      <div className="stat"><span>⏰ {item.total_hours} giờ</span></div>
                      <div className="stat salary"><span>💰 {formatCurrency(item.total_salary)}</span></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-data">Không có dữ liệu</div>
              )}
            </div>
          </div>
        )}

        {viewMode === "chart" && (
          <div className="chart-salary">
            <div className="chart-container">
              <div className="total-salary-banner" style={{ 
                background: 'linear-gradient(135deg, #28a745, #20c997)', 
                color: 'white', 
                padding: '20px', 
                borderRadius: '16px', 
                marginBottom: '24px', 
                textAlign: 'center' 
              }}>
                <div>💰 TỔNG LƯƠNG {selectedWeek !== "all" ? `${currentWeekInfo?.label}` : `THÁNG ${selectedMonth}/${selectedYear}`}</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>
                  {formatCurrency(chartData.reduce((s, i) => s + i.total_salary, 0))}
                </div>
                <div>
                  🏢 {chartData.length} chỗ làm | ⏰ {chartData.reduce((s, i) => s + i.total_hours, 0)} giờ | 📋 {chartData.reduce((s, i) => s + i.total_shifts, 0)} ca
                </div>
              </div>
              {chartData.length > 0 ? (
                <div className="pie-chart-multi">
                  <div className="pie-legend">
                    {chartData.map((item, idx) => {
                      const total = chartData.reduce((s, i) => s + i.total_salary, 0);
                      const percent = total > 0 ? (item.total_salary / total) * 100 : 0;
                      return (
                        <div key={idx} className="legend-item">
                          <div className="legend-color" style={{ background: colors[idx % colors.length] }}></div>
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
                <div className="empty-data">Không có dữ liệu lương trong {selectedWeek !== "all" ? `tuần này` : "tháng này"}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Salary;