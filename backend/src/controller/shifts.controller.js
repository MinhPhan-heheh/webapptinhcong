const pool = require("../db");

// ==================== CẤU HÌNH MÚI GIỜ VIỆT NAM ====================
// Hàm lấy ngày hiện tại theo múi giờ Việt Nam (UTC+7)
const getCurrentVietnamDate = () => {
  const now = new Date();
  const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Hàm format date về YYYY-MM-DD theo VN
const formatVNDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0];
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/* ================= TÍNH GIỜ LÀM ================= */
const calculateWorkHours = (start_time, end_time, has_break, break_minutes) => {
  const [startHour, startMinute] = start_time.split(":").map(Number);
  const [endHour, endMinute] = end_time.split(":").map(Number);

  let totalMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);

  if (has_break && break_minutes > 0) {
    totalMinutes -= break_minutes;
  }

  totalMinutes = Math.max(0, totalMinutes);
  return totalMinutes / 60;
};

/* ================= TÍNH LƯƠNG ================= */
const calculateSalaryAmount = (workHours, hourlyRate, holidayType, overtimeRate) => {
  let multiplier = 1;
  if (holidayType === "holiday") {
    multiplier = parseFloat(overtimeRate) || 2;
  }
  return workHours * parseFloat(hourlyRate) * multiplier;
};

/* ================= LẤY HOẶC TẠO SALARY_RECORD ================= */
const getOrCreateSalaryRecord = async (user_id, shift_date) => {
  const year = new Date(shift_date).getFullYear();
  const month = new Date(shift_date).getMonth() + 1;

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

/* ================= LẤY DANH SÁCH CA ================= */
const getMyShifts = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `
      SELECT
        s.*,
        w.name AS workplace_name,
        w.address,
        w.hourly_rate,
        w.has_break,
        w.break_minutes,
        w.overtime_rate
      FROM shifts s
      INNER JOIN workplaces w ON s.workplace_id = w.id
      WHERE s.user_id = $1
      ORDER BY s.shift_date ASC, s.start_time ASC
      `,
      [user_id]
    );

    const shifts = result.rows.map((shift) => {
      const work_hours = calculateWorkHours(
        shift.start_time,
        shift.end_time,
        shift.has_break,
        shift.break_minutes
      );

      const salary = calculateSalaryAmount(
        work_hours,
        shift.hourly_rate,
        shift.holiday_type,
        shift.overtime_rate
      );

      return {
        ...shift,
        shift_date: formatVNDate(shift.shift_date),
        work_hours: Number(work_hours.toFixed(2)),
        salary: Number(salary.toFixed(0)),
      };
    });

    return res.json({
      success: true,
      shifts,
    });
  } catch (error) {
    console.error("Get My Shifts Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= TẠO CA LÀM ================= */
const createShift = async (req, res) => {
  try {
    const user_id = req.user.id;

    let {
      workplace_id,
      shift_date,
      start_time,
      end_time,
      holiday_type,
    } = req.body;

    if (!workplace_id || !shift_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu",
      });
    }

    // Xử lý shift_date
    shift_date = formatVNDate(shift_date);
    if (!shift_date) {
      return res.status(400).json({
        success: false,
        message: "Ngày không hợp lệ",
      });
    }

    if (start_time >= end_time) {
      return res.status(400).json({
        success: false,
        message: "Giờ kết thúc phải lớn hơn giờ bắt đầu",
      });
    }

    // Kiểm tra workplace
    const workplaceCheck = await pool.query(
      `SELECT * FROM workplaces WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [workplace_id, user_id]
    );

    if (workplaceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chỗ làm không tồn tại",
      });
    }

    // Kiểm tra trùng lịch
    const conflict = await pool.query(
      `
      SELECT id FROM shifts
      WHERE user_id = $1 AND shift_date = $2
      AND (
        (start_time <= $3 AND end_time > $3)
        OR (start_time < $4 AND end_time >= $4)
        OR (start_time >= $3 AND end_time <= $4)
      )
      `,
      [user_id, shift_date, start_time, end_time]
    );

    if (conflict.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ca làm bị trùng giờ",
      });
    }

    // Tạo shift
    const result = await pool.query(
      `
      INSERT INTO shifts (user_id, workplace_id, shift_date, start_time, end_time, holiday_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [user_id, workplace_id, shift_date, start_time, end_time, holiday_type || "normal"]
    );

    const workplace = workplaceCheck.rows[0];
    const work_hours = calculateWorkHours(start_time, end_time, workplace.has_break, workplace.break_minutes);
    const shift_salary = calculateSalaryAmount(work_hours, workplace.hourly_rate, holiday_type, workplace.overtime_rate);

    const salaryRecordId = await getOrCreateSalaryRecord(user_id, shift_date);

    await pool.query(
      `
      INSERT INTO salary_details (
        salary_record_id, shift_id, workplace_id, shift_date,
        start_time, end_time, work_hours, hourly_rate,
        overtime_rate, holiday_type, shift_salary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        salaryRecordId, result.rows[0].id, workplace_id, shift_date,
        start_time, end_time, work_hours, workplace.hourly_rate,
        workplace.overtime_rate, holiday_type || "normal", Math.round(shift_salary)
      ]
    );

    await pool.query(
      `
      UPDATE salary_records
      SET total_salary = (SELECT COALESCE(SUM(shift_salary), 0) FROM salary_details WHERE salary_record_id = $1),
          total_hours = (SELECT COALESCE(SUM(work_hours), 0) FROM salary_details WHERE salary_record_id = $1),
          total_shifts = (SELECT COUNT(*) FROM salary_details WHERE salary_record_id = $1)
      WHERE id = $1
      `,
      [salaryRecordId]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo ca làm thành công",
      shift: result.rows[0],
    });
  } catch (error) {
    console.error("Create Shift Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= UPDATE SHIFT ================= */
const updateShift = async (req, res) => {
  try {
    const user_id = req.user.id;
    const shift_id = req.params.id;

    let { workplace_id, shift_date, start_time, end_time, holiday_type } = req.body;

    if (shift_date) {
      shift_date = formatVNDate(shift_date);
    }

    const oldShift = await pool.query(
      `SELECT * FROM shifts WHERE id = $1 AND user_id = $2`,
      [shift_id, user_id]
    );

    if (oldShift.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ca làm",
      });
    }

    const result = await pool.query(
      `
      UPDATE shifts
      SET workplace_id = COALESCE($1, workplace_id),
          shift_date = COALESCE($2, shift_date),
          start_time = COALESCE($3, start_time),
          end_time = COALESCE($4, end_time),
          holiday_type = COALESCE($5, holiday_type)
      WHERE id = $6 AND user_id = $7
      RETURNING *
      `,
      [workplace_id, shift_date, start_time, end_time, holiday_type, shift_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ca làm",
      });
    }

    const finalWorkplaceId = workplace_id || oldShift.rows[0].workplace_id;
    const finalShiftDate = shift_date || oldShift.rows[0].shift_date;
    const finalStartTime = start_time || oldShift.rows[0].start_time;
    const finalEndTime = end_time || oldShift.rows[0].end_time;
    const finalHolidayType = holiday_type || oldShift.rows[0].holiday_type;

    const workplaceResult = await pool.query(
      `SELECT * FROM workplaces WHERE id = $1`,
      [finalWorkplaceId]
    );
    const w = workplaceResult.rows[0];

    const work_hours = calculateWorkHours(finalStartTime, finalEndTime, w.has_break, w.break_minutes);
    const shift_salary = calculateSalaryAmount(work_hours, w.hourly_rate, finalHolidayType, w.overtime_rate);

    const salaryRecord = await pool.query(
      `SELECT id FROM salary_records 
       WHERE user_id = $1 AND salary_month = $2 AND salary_year = $3`,
      [user_id, new Date(finalShiftDate).getMonth() + 1, new Date(finalShiftDate).getFullYear()]
    );

    if (salaryRecord.rows.length > 0) {
      await pool.query(
        `
        UPDATE salary_details
        SET workplace_id = $1, shift_date = $2, start_time = $3, end_time = $4,
            work_hours = $5, hourly_rate = $6, overtime_rate = $7,
            holiday_type = $8, shift_salary = $9
        WHERE shift_id = $10
        `,
        [finalWorkplaceId, finalShiftDate, finalStartTime, finalEndTime, 
         work_hours, w.hourly_rate, w.overtime_rate, finalHolidayType, Math.round(shift_salary), shift_id]
      );

      await pool.query(
        `
        UPDATE salary_records
        SET total_salary = (SELECT COALESCE(SUM(shift_salary), 0) FROM salary_details WHERE salary_record_id = $1),
            total_hours = (SELECT COALESCE(SUM(work_hours), 0) FROM salary_details WHERE salary_record_id = $1),
            total_shifts = (SELECT COUNT(*) FROM salary_details WHERE salary_record_id = $1)
        WHERE id = $1
        `,
        [salaryRecord.rows[0].id]
      );
    }

    return res.json({
      success: true,
      message: "Cập nhật thành công",
      shift: result.rows[0],
    });
  } catch (error) {
    console.error("Update Shift Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= XÓA SHIFT ================= */
const deleteShift = async (req, res) => {
  try {
    const user_id = req.user.id;
    const shift_id = req.params.id;

    const shiftInfo = await pool.query(
      `SELECT shift_date FROM shifts WHERE id = $1 AND user_id = $2`,
      [shift_id, user_id]
    );

    if (shiftInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ca làm",
      });
    }

    await pool.query(`DELETE FROM salary_details WHERE shift_id = $1`, [shift_id]);

    const result = await pool.query(
      `DELETE FROM shifts WHERE id = $1 AND user_id = $2 RETURNING *`,
      [shift_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ca làm",
      });
    }

    const shiftDate = shiftInfo.rows[0].shift_date;
    const year = new Date(shiftDate).getFullYear();
    const month = new Date(shiftDate).getMonth() + 1;

    const salaryRecord = await pool.query(
      `SELECT id FROM salary_records WHERE user_id = $1 AND salary_month = $2 AND salary_year = $3`,
      [user_id, month, year]
    );

    if (salaryRecord.rows.length > 0) {
      await pool.query(
        `
        UPDATE salary_records
        SET total_salary = (SELECT COALESCE(SUM(shift_salary), 0) FROM salary_details WHERE salary_record_id = $1),
            total_hours = (SELECT COALESCE(SUM(work_hours), 0) FROM salary_details WHERE salary_record_id = $1),
            total_shifts = (SELECT COUNT(*) FROM salary_details WHERE salary_record_id = $1)
        WHERE id = $1
        `,
        [salaryRecord.rows[0].id]
      );
    }

    return res.json({
      success: true,
      message: "Xóa ca làm thành công",
    });
  } catch (error) {
    console.error("Delete Shift Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= CHI TIẾT SHIFT ================= */
const getShiftDetail = async (req, res) => {
  try {
    const user_id = req.user.id;
    const shift_id = req.params.id;

    const result = await pool.query(
      `
      SELECT
        s.*,
        w.name AS workplace_name,
        w.address,
        w.hourly_rate,
        w.has_break,
        w.break_minutes,
        w.overtime_rate
      FROM shifts s
      INNER JOIN workplaces w ON s.workplace_id = w.id
      WHERE s.id = $1 AND s.user_id = $2
      `,
      [shift_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ca làm",
      });
    }

    const shift = result.rows[0];
    const work_hours = calculateWorkHours(shift.start_time, shift.end_time, shift.has_break, shift.break_minutes);
    const salary = calculateSalaryAmount(work_hours, shift.hourly_rate, shift.holiday_type, shift.overtime_rate);

    return res.json({
      success: true,
      shift: {
        ...shift,
        shift_date: formatVNDate(shift.shift_date),
        work_hours: Number(work_hours.toFixed(2)),
        salary: Number(salary.toFixed(0)),
      },
    });
  } catch (error) {
    console.error("Get Shift Detail Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createShift,
  getMyShifts,
  updateShift,
  deleteShift,
  getShiftDetail,
};