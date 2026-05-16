const pool = require("../db");

/* ================= TÍNH GIỜ LÀM ================= */
const calculateWorkHours = (start_time, end_time, has_break, break_minutes) => {
  const [startHour, startMinute] = start_time.split(":").map(Number);
  const [endHour, endMinute] = end_time.split(":").map(Number);

  let totalMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);

  if (has_break && break_minutes > 0) {
    totalMinutes -= break_minutes;
  }

  return Math.max(0, totalMinutes / 60);
};

/* ================= TÍNH TIỀN LƯƠNG ================= */
const calculateSalaryAmount = (workHours, hourlyRate, holidayType, overtimeRate) => {
  let multiplier = 1;
  if (holidayType === "holiday") {
    multiplier = parseFloat(overtimeRate) || 2;
  }
  return workHours * parseFloat(hourlyRate) * multiplier;
};

/* ================= LẤY HOẶC TẠO SALARY_RECORD ================= */
const getOrCreateSalaryRecord = async (user_id, year, month) => {
  let result = await pool.query(
    `SELECT id FROM salary_records 
     WHERE user_id = $1 AND salary_month = $2 AND salary_year = $3`,
    [user_id, month, year]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  result = await pool.query(
    `INSERT INTO salary_records (user_id, salary_month, salary_year, total_shifts, total_hours, total_salary)
     VALUES ($1, $2, $3, 0, 0, 0)
     RETURNING id`,
    [user_id, month, year]
  );

  return result.rows[0].id;
};

/* ================= TÍNH VÀ LƯU LƯƠNG ================= */
const calculateSalary = async (req, res) => {
  try {
    const user_id = req.user.id;
    let { year, month, workplace_id } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp năm và tháng"
      });
    }

    year = parseInt(year);
    month = parseInt(month);

    // KIỂM TRA SALARY_RECORDS TRƯỚC
    const existingRecord = await pool.query(
      `SELECT * FROM salary_records 
       WHERE user_id = $1 AND salary_year = $2 AND salary_month = $3`,
      [user_id, year, month]
    );

    if (existingRecord.rows.length > 0) {
      // Lấy dữ liệu từ salary_details
      const detailsQuery = `
        SELECT 
          sd.shift_id,
          sd.shift_date,
          sd.start_time,
          sd.end_time,
          sd.workplace_id,
          sd.work_hours,
          sd.hourly_rate as base_salary,
          sd.overtime_rate as holiday_rate,
          sd.holiday_type,
          sd.shift_salary,
          w.name as workplace_name
        FROM salary_details sd
        INNER JOIN workplaces w ON sd.workplace_id = w.id
        WHERE sd.salary_record_id = $1
        ORDER BY sd.shift_date ASC, sd.start_time ASC
      `;
      
      const detailsResult = await pool.query(detailsQuery, [existingRecord.rows[0].id]);
      
      const details = detailsResult.rows.map(row => ({
        shift_id: row.shift_id,
        shift_date: row.shift_date,
        start_time: row.start_time,
        end_time: row.end_time,
        workplace_id: row.workplace_id,
        workplace_name: row.workplace_name,
        work_hours: parseFloat(row.work_hours),
        base_salary: parseFloat(row.base_salary),
        holiday_type: row.holiday_type,
        holiday_rate: parseFloat(row.holiday_rate),
        shift_salary: parseFloat(row.shift_salary)
      }));

      return res.json({
        success: true,
        total_salary: parseFloat(existingRecord.rows[0].total_salary),
        total_hours: parseFloat(existingRecord.rows[0].total_hours),
        total_shifts: parseInt(existingRecord.rows[0].total_shifts),
        details: details
      });
    }

    // Nếu chưa có record, tính từ shifts
    let query = `
      SELECT 
        s.id as shift_id,
        s.shift_date,
        s.start_time,
        s.end_time,
        s.holiday_type,
        w.id as workplace_id,
        w.name as workplace_name,
        w.hourly_rate,
        w.has_break,
        w.break_minutes,
        w.overtime_rate
      FROM shifts s
      INNER JOIN workplaces w ON s.workplace_id = w.id
      WHERE s.user_id = $1 
      AND EXTRACT(YEAR FROM s.shift_date) = $2 
      AND EXTRACT(MONTH FROM s.shift_date) = $3
    `;

    const params = [user_id, year, month];

    if (workplace_id && workplace_id !== "all" && workplace_id !== "undefined") {
      query += ` AND s.workplace_id = $4`;
      params.push(parseInt(workplace_id));
    }

    query += ` ORDER BY s.shift_date ASC, s.start_time ASC`;

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        total_salary: 0,
        total_hours: 0,
        total_shifts: 0,
        details: [],
        message: "Không có ca làm trong tháng này"
      });
    }

    const details = [];
    let totalHours = 0;
    let totalSalary = 0;

    for (const shift of result.rows) {
      const workHours = calculateWorkHours(
        shift.start_time,
        shift.end_time,
        shift.has_break,
        shift.break_minutes
      );

      const shiftSalary = calculateSalaryAmount(
        workHours,
        shift.hourly_rate,
        shift.holiday_type,
        shift.overtime_rate
      );

      details.push({
        shift_id: shift.shift_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        workplace_id: shift.workplace_id,
        workplace_name: shift.workplace_name,
        work_hours: Number(workHours.toFixed(2)),
        base_salary: shift.hourly_rate,
        holiday_type: shift.holiday_type,
        holiday_rate: shift.holiday_type === "holiday" ? shift.overtime_rate : 1,
        shift_salary: Math.round(shiftSalary)
      });

      totalHours += workHours;
      totalSalary += shiftSalary;
    }

    totalSalary = Math.round(totalSalary);
    totalHours = Number(totalHours.toFixed(2));

    // Lưu vào database
    const salaryRecordId = await getOrCreateSalaryRecord(user_id, year, month);

    await pool.query(
      `DELETE FROM salary_details WHERE salary_record_id = $1`,
      [salaryRecordId]
    );

    for (const detail of details) {
      await pool.query(
        `INSERT INTO salary_details (
          salary_record_id, shift_id, workplace_id, shift_date, 
          start_time, end_time, work_hours, hourly_rate, 
          overtime_rate, holiday_type, shift_salary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          salaryRecordId,
          detail.shift_id,
          detail.workplace_id,
          detail.shift_date,
          detail.start_time,
          detail.end_time,
          detail.work_hours,
          detail.base_salary,
          detail.holiday_rate,
          detail.holiday_type,
          detail.shift_salary
        ]
      );
    }

    await pool.query(
      `UPDATE salary_records 
       SET total_shifts = $1, total_hours = $2, total_salary = $3, created_at = NOW()
       WHERE id = $4`,
      [details.length, totalHours, totalSalary, salaryRecordId]
    );

    return res.json({
      success: true,
      total_salary: totalSalary,
      total_hours: totalHours,
      total_shifts: details.length,
      salary_record_id: salaryRecordId,
      details: details
    });

  } catch (error) {
    console.error("Calculate Salary Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= LẤY LƯƠNG THEO TỪNG CHỖ LÀM ================= */
const getSalaryByWorkplace = async (req, res) => {
  try {
    const user_id = req.user.id;
    let { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp năm và tháng"
      });
    }

    year = parseInt(year);
    month = parseInt(month);

    const salaryRecord = await pool.query(
      `SELECT id FROM salary_records 
       WHERE user_id = $1 AND salary_month = $2 AND salary_year = $3`,
      [user_id, month, year]
    );

    if (salaryRecord.rows.length === 0) {
      return res.json({
        success: true,
        details: []
      });
    }

    const query = `
      SELECT 
        w.id as workplace_id,
        w.name as workplace_name,
        COUNT(sd.id) as total_shifts,
        SUM(sd.work_hours) as total_hours,
        SUM(sd.shift_salary) as total_salary
      FROM salary_details sd
      INNER JOIN workplaces w ON sd.workplace_id = w.id
      WHERE sd.salary_record_id = $1
      GROUP BY w.id, w.name
      ORDER BY total_salary DESC
    `;

    const result = await pool.query(query, [salaryRecord.rows[0].id]);

    return res.json({
      success: true,
      details: result.rows.map(row => ({
        workplace_id: row.workplace_id,
        workplace_name: row.workplace_name,
        total_shifts: parseInt(row.total_shifts),
        total_hours: Number(parseFloat(row.total_hours).toFixed(2)),
        total_salary: Math.round(parseFloat(row.total_salary))
      }))
    });

  } catch (error) {
    console.error("Get Salary By Workplace Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= LẤY LƯƠNG THEO TUẦN ================= */
const getSalaryByWeek = async (req, res) => {
  try {
    const user_id = req.user.id;
    let { year, month, week } = req.query;

    if (!year || !month || !week) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp năm, tháng và tuần"
      });
    }

    year = parseInt(year);
    month = parseInt(month);
    week = parseInt(week);

    // Tính ngày bắt đầu và kết thúc của tuần
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, lastDayOfMonth);

    const startDate = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    // Lấy salary_record_id
    const salaryRecord = await pool.query(
      `SELECT id FROM salary_records 
       WHERE user_id = $1 AND salary_month = $2 AND salary_year = $3`,
      [user_id, month, year]
    );

    if (salaryRecord.rows.length === 0) {
      return res.json({
        success: true,
        total_salary: 0,
        total_hours: 0,
        total_shifts: 0,
        details: [],
        week_info: {
          week: week,
          start_date: startDate,
          end_date: endDate
        }
      });
    }

    const query = `
      SELECT 
        sd.shift_id,
        sd.shift_date,
        sd.start_time,
        sd.end_time,
        sd.workplace_id,
        sd.work_hours,
        sd.hourly_rate as base_salary,
        sd.overtime_rate as holiday_rate,
        sd.holiday_type,
        sd.shift_salary,
        w.name as workplace_name
      FROM salary_details sd
      INNER JOIN workplaces w ON sd.workplace_id = w.id
      WHERE sd.salary_record_id = $1
      AND sd.shift_date BETWEEN $2 AND $3
      ORDER BY sd.shift_date ASC, sd.start_time ASC
    `;

    const result = await pool.query(query, [salaryRecord.rows[0].id, startDate, endDate]);

    const details = result.rows.map(row => ({
      shift_id: row.shift_id,
      shift_date: row.shift_date,
      start_time: row.start_time,
      end_time: row.end_time,
      workplace_id: row.workplace_id,
      workplace_name: row.workplace_name,
      work_hours: parseFloat(row.work_hours),
      base_salary: parseFloat(row.base_salary),
      holiday_type: row.holiday_type,
      holiday_rate: parseFloat(row.holiday_rate),
      shift_salary: parseFloat(row.shift_salary)
    }));

    const totalSalary = details.reduce((sum, d) => sum + d.shift_salary, 0);
    const totalHours = details.reduce((sum, d) => sum + d.work_hours, 0);
    const totalShifts = details.length;

    // Tính tổng theo từng chỗ làm
    const workplaceMap = new Map();
    details.forEach(item => {
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

    return res.json({
      success: true,
      total_salary: Math.round(totalSalary),
      total_hours: Number(totalHours.toFixed(2)),
      total_shifts: totalShifts,
      details: details,
      workplace_details: Array.from(workplaceMap.values()),
      week_info: {
        week: week,
        start_date: startDate,
        end_date: endDate
      }
    });

  } catch (error) {
    console.error("Get Salary By Week Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= LẤY LỊCH SỬ LƯƠNG ================= */
const getSalaryHistory = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT * FROM salary_records 
       WHERE user_id = $1 
       ORDER BY salary_year DESC, salary_month DESC`,
      [user_id]
    );

    return res.json({
      success: true,
      history: result.rows
    });

  } catch (error) {
    console.error("Get Salary History Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= XÓA BẢN GHI LƯƠNG ================= */
const deleteSalaryRecord = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM salary_records 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bản ghi lương"
      });
    }

    return res.json({
      success: true,
      message: "Xóa bản ghi lương thành công"
    });

  } catch (error) {
    console.error("Delete Salary Record Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  calculateSalary,
  getSalaryByWorkplace,
  getSalaryByWeek,
  getSalaryHistory,
  deleteSalaryRecord
};