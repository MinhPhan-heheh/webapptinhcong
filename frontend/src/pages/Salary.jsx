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
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );

  const [selectedWorkplace, setSelectedWorkplace] =
    useState("all");

  const [workplaceFilter, setWorkplaceFilter] =
    useState("all");

  const [chartFilter, setChartFilter] = useState("all");

  const [selectedWeek, setSelectedWeek] = useState("all");

  const [salaryData, setSalaryData] = useState(null);

  const [allWorkplaces, setAllWorkplaces] = useState([]);

  const [workplaceSalaryData, setWorkplaceSalaryData] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState("detail");

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "",
  });

  const showToast = useCallback(
    (message, type = "success") => {
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
      }, 3000);
    },
    []
  );

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from(
      { length: 5 },
      (_, i) => currentYear - 2 + i
    );
  }, []);

  const months = [
    1, 2, 3, 4, 5, 6,
    7, 8, 9, 10, 11, 12,
  ];

  const colors = [
    "#28a745",
    "#ff9800",
    "#dc3545",
    "#007bff",
    "#6f42c1",
    "#20c997",
    "#fd7e14",
    "#e83e8c",
  ];

  // =========================
  // TÍNH TUẦN TRONG THÁNG
  // =========================

  const getWeeksInMonth = useCallback((year, month) => {
    const firstDayOfMonth = new Date(year, month - 1, 1);

    const lastDayOfMonth = new Date(year, month, 0);

    const lastDate = lastDayOfMonth.getDate();

    let currentDate = new Date(firstDayOfMonth);

    let currentDayOfWeek = currentDate.getDay();

    let startOfFirstWeek = new Date(currentDate);

    if (currentDayOfWeek === 0) {
      startOfFirstWeek.setDate(
        currentDate.getDate() - 6
      );
    } else if (currentDayOfWeek !== 1) {
      startOfFirstWeek.setDate(
        currentDate.getDate() -
          (currentDayOfWeek - 1)
      );
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

      if (
        startDay <= lastDate &&
        startMonth === month
      ) {
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
          startDate: new Date(
            year,
            month - 1,
            startDay
          ),
          endDate: new Date(
            year,
            month - 1,
            endDay
          ),
        });
      }

      weekStart.setDate(
        weekStart.getDate() + 7
      );

      weekNumber++;
    }

    return weeks;
  }, []);

  const weeksInMonth = useMemo(() => {
    return getWeeksInMonth(
      selectedYear,
      selectedMonth
    );
  }, [
    selectedYear,
    selectedMonth,
    getWeeksInMonth,
  ]);

  // =========================
  // LOAD DATA
  // =========================

  const fetchWorkplaces = useCallback(async () => {
    try {
      // ĐÃ SỬA: từ "/api/workplaces/my" thành "/api/work-places/my"
      const response = await api.get("/work-places/my");

      if (response.data.success) {
        setAllWorkplaces(
          response.data.workplaces || []
        );
      }
    } catch (error) {
      console.error(
        "Lỗi fetch workplaces:",
        error
      );
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [salaryRes, workplaceRes] =
        await Promise.all([
          api.get(
            `/salary/calculate?year=${selectedYear}&month=${selectedMonth}`
          ),

          api.get(
            `/salary/by-workplace?year=${selectedYear}&month=${selectedMonth}`
          ),
        ]);

      if (salaryRes.data.success) {
        setSalaryData(salaryRes.data);
      }

      if (workplaceRes.data.success) {
        setWorkplaceSalaryData(
          workplaceRes.data.details || []
        );
      }
    } catch (error) {
      console.error("Lỗi load data:", error);

      showToast(
        "Không thể tải dữ liệu",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedYear,
    selectedMonth,
    showToast,
  ]);

  useEffect(() => {
    loadData();
    fetchWorkplaces();
  }, [loadData, fetchWorkplaces]);

  // =========================
  // FORMAT
  // =========================

  const formatCurrency = useCallback(
    (amount) => {
      if (!amount && amount !== 0) {
        return "0₫";
      }

      return (
        Number(amount).toLocaleString(
          "vi-VN"
        ) + "₫"
      );
    },
    []
  );

  const formatDate = useCallback((date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString(
      "vi-VN"
    );
  }, []);

  // =========================
  // FILTER DETAIL
  // =========================

  const filteredSalaryData = useMemo(() => {
    if (!salaryData) return null;

    let details = salaryData.details || [];

    // lọc tuần
    if (selectedWeek !== "all") {
      const weekInfo = weeksInMonth.find(
        (w) =>
          w.week === Number(selectedWeek)
      );

      if (weekInfo) {
        details = details.filter((item) => {
          const day = new Date(
            item.shift_date
          ).getDate();

          return (
            day >= weekInfo.startDay &&
            day <= weekInfo.endDay
          );
        });
      }
    }

    // lọc chỗ làm
    if (selectedWorkplace !== "all") {
      details = details.filter(
        (item) =>
          item.workplace_id ===
          Number(selectedWorkplace)
      );
    }

    return {
      ...salaryData,
      details,
      total_salary: details.reduce(
        (sum, item) =>
          sum + Number(item.shift_salary || 0),
        0
      ),

      total_hours: details.reduce(
        (sum, item) =>
          sum + Number(item.work_hours || 0),
        0
      ),

      total_shifts: details.length,
    };
  }, [
    salaryData,
    selectedWeek,
    selectedWorkplace,
    weeksInMonth,
  ]);

  // =========================
  // WORKPLACE DATA
  // =========================

  const filteredWorkplaceData = useMemo(() => {
    let data = [...workplaceSalaryData];

    if (workplaceFilter !== "all") {
      data = data.filter(
        (item) =>
          item.workplace_id ===
          Number(workplaceFilter)
      );
    }

    return data;
  }, [
    workplaceSalaryData,
    workplaceFilter,
  ]);

  // =========================
  // CHART DATA
  // =========================

  const chartData = useMemo(() => {
    let data = [...workplaceSalaryData];

    if (chartFilter !== "all") {
      data = data.filter(
        (item) =>
          item.workplace_id ===
          Number(chartFilter)
      );
    }

    return data;
  }, [workplaceSalaryData, chartFilter]);

  // =========================
  // TOTAL
  // =========================

  const totalSalary =
    filteredSalaryData?.total_salary || 0;

  const totalHours =
    filteredSalaryData?.total_hours || 0;

  const totalShifts =
    filteredSalaryData?.total_shifts || 0;

  const currentWeekInfo = useMemo(() => {
    if (selectedWeek !== "all") {
      return weeksInMonth.find(
        (w) =>
          w.week === Number(selectedWeek)
      );
    }

    return null;
  }, [selectedWeek, weeksInMonth]);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="salary-page">
        <div className="salary-header">
          <h1 className="title">
            💰 Quản lý lương
          </h1>
        </div>

        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="salary-page">
      {toast.show && (
        <div
          className={`toast-notification ${toast.type}`}
        >
          {toast.type === "error"
            ? "❌ "
            : "✅ "}

          {toast.message}
        </div>
      )}

      <div className="salary-header">
        <h1 className="title">
          💰 Quản lý lương
        </h1>
      </div>

      {/* FILTER */}

      <div className="filter-bar">
        <div className="filter-group">
          <label>NĂM</label>

          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(
                Number(e.target.value)
              )
            }
          >
            {years.map((year) => (
              <option
                key={year}
                value={year}
              >
                Năm {year}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>THÁNG</label>

          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(
                Number(e.target.value)
              );

              setSelectedWeek("all");
            }}
          >
            {months.map((month) => (
              <option
                key={month}
                value={month}
              >
                Tháng {month}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>📅 TUẦN</label>

          <select
            value={selectedWeek}
            onChange={(e) =>
              setSelectedWeek(
                e.target.value
              )
            }
          >
            <option value="all">
              📋 Tất cả
            </option>

            {weeksInMonth.map((week) => (
              <option
                key={week.week}
                value={week.week}
              >
                {week.label}
              </option>
            ))}
          </select>
        </div>

        {viewMode === "detail" && (
          <div className="filter-group">
            <label>🏢 CHỖ LÀM</label>

            <select
              value={selectedWorkplace}
              onChange={(e) =>
                setSelectedWorkplace(
                  e.target.value
                )
              }
            >
              <option value="all">
                📋 Tất cả
              </option>

              {allWorkplaces.map((w) => (
                <option
                  key={w.id}
                  value={w.id}
                >
                  🏢 {w.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB */}

      <div className="view-toggle">
        <button
          className={`view-btn ${
            viewMode === "detail"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setViewMode("detail")
          }
        >
          📋 Chi tiết
        </button>

        <button
          className={`view-btn ${
            viewMode === "workplace"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setViewMode("workplace")
          }
        >
          🏢 Theo chỗ làm
        </button>

        <button
          className={`view-btn ${
            viewMode === "chart"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setViewMode("chart")
          }
        >
          📊 Biểu đồ
        </button>
      </div>

      {/* DETAIL */}

      {viewMode === "detail" && (
        <>
          <div className="summary-cards">
            <SummaryCard
              icon="💰"
              label="Tổng lương"
              value={formatCurrency(
                totalSalary
              )}
            />

            <SummaryCard
              icon="⏰"
              label="Tổng giờ"
              value={`${totalHours} giờ`}
            />

            <SummaryCard
              icon="📋"
              label="Tổng ca"
              value={`${totalShifts} ca`}
            />
          </div>

          <div className="salary-table-container">
            <h3 className="table-title">
              📋 Chi tiết ca làm
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
                  {filteredSalaryData?.details
                    ?.length > 0 ? (
                    filteredSalaryData.details.map(
                      (item, idx) => (
                        <tr
                          key={idx}
                          className={
                            item.holiday_type ===
                            "holiday"
                              ? "holiday-row"
                              : ""
                          }
                        >
                          <td>
                            {formatDate(
                              item.shift_date
                            )}
                          </td>

                          <td>
                            {
                              item.workplace_name
                            }
                          </td>

                          <td>
                            {item.start_time} -{" "}
                            {item.end_time}
                          </td>

                          <td>
                            {item.work_hours}h
                          </td>

                          <td>
                            {formatCurrency(
                              item.base_salary
                            )}
                            /h
                          </td>

                          <td>
                            {item.holiday_rate ===
                            1
                              ? ""
                              : `x${item.holiday_rate}`}
                          </td>

                          <td className="salary-amount">
                            {formatCurrency(
                              item.shift_salary
                            )}
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="empty-data"
                      >
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* WORKPLACE */}

      {viewMode === "workplace" && (
        <div className="workplace-list">
          {filteredWorkplaceData.length >
          0 ? (
            filteredWorkplaceData.map(
              (item, idx) => (
                <div
                  key={idx}
                  className="workplace-salary-card"
                >
                  <div className="workplace-name">
                    {item.workplace_name}
                  </div>

                  <div className="workplace-stats">
                    <div className="stat">
                      📋 {item.total_shifts} ca
                    </div>

                    <div className="stat">
                      ⏰ {item.total_hours} giờ
                    </div>

                    <div className="stat salary">
                      💰{" "}
                      {formatCurrency(
                        item.total_salary
                      )}
                    </div>
                  </div>
                </div>
              )
            )
          ) : (
            <div className="empty-data">
              Không có dữ liệu
            </div>
          )}
        </div>
      )}

      {/* CHART */}

      {viewMode === "chart" && (
        <div className="chart-container">
          <div className="pie-legend">
            {chartData.map((item, idx) => {
              const total =
                chartData.reduce(
                  (sum, i) =>
                    sum +
                    Number(
                      i.total_salary || 0
                    ),
                  0
                );

              const percent =
                total > 0
                  ? (
                      (item.total_salary /
                        total) *
                      100
                    ).toFixed(1)
                  : 0;

              return (
                <div
                  key={idx}
                  className="legend-item"
                >
                  <div
                    className="legend-color"
                    style={{
                      background:
                        colors[
                          idx %
                            colors.length
                        ],
                    }}
                  ></div>

                  <div className="legend-info">
                    <span className="legend-name">
                      {
                        item.workplace_name
                      }
                    </span>

                    <span className="legend-value">
                      {formatCurrency(
                        item.total_salary
                      )}
                    </span>

                    <span className="legend-percent">
                      ({percent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Salary;