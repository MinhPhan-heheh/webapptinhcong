const pool = require("../db");

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Chưa đăng nhập" 
      });
    }

    // Lấy thông tin user
    const userResult = await pool.query(
      `SELECT id, full_name, email, phone, is_verified, avatar, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy người dùng" 
      });
    }

    const user = userResult.rows[0];

    // Thống kê ca làm trong tuần này
    const weekStatsResult = await pool.query(
      `
      SELECT 
        COUNT(*) AS total_shifts_this_week,
        COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0) AS total_hours_this_week
      FROM shifts
      WHERE user_id = $1
        AND shift_date >= DATE_TRUNC('week', CURRENT_DATE)
        AND shift_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
      `,
      [userId]
    );

    // Thống kê ca làm trong tháng này
    const monthStatsResult = await pool.query(
      `
      SELECT 
        COUNT(*) AS total_shifts_this_month,
        COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0) AS total_hours_this_month,
        COALESCE(SUM(
          (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - 
           CASE WHEN w.has_break THEN w.break_minutes / 60.0 ELSE 0 END) * 
          w.hourly_rate *
          CASE 
            WHEN s.holiday_type = 'holiday' THEN COALESCE(w.overtime_rate, 2.0)
            ELSE 1.0
          END
        ), 0) AS total_salary_this_month
      FROM shifts s
      INNER JOIN workplaces w ON s.workplace_id = w.id
      WHERE s.user_id = $1
        AND s.shift_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND s.shift_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      `,
      [userId]
    );

    // Lấy tổng số chỗ làm
    const workplacesResult = await pool.query(
      `SELECT COUNT(*) AS total_workplaces FROM workplaces WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    // Lấy ca làm sắp tới (5 ca gần nhất)
    const upcomingShiftsResult = await pool.query(
      `
      SELECT 
        s.id,
        s.shift_date,
        s.start_time,
        s.end_time,
        s.holiday_type,
        w.name as workplace_name
      FROM shifts s
      INNER JOIN workplaces w ON s.workplace_id = w.id
      WHERE s.user_id = $1
        AND s.shift_date >= CURRENT_DATE
      ORDER BY s.shift_date ASC, s.start_time ASC
      LIMIT 5
      `,
      [userId]
    );

    const weekStats = weekStatsResult.rows[0] || {};
    const monthStats = monthStatsResult.rows[0] || {};

    // Tính lương ước tính (lấy từ bảng shifts đã có)
    const estimatedSalary = Math.round(parseFloat(monthStats.total_salary_this_month || 0));

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          is_verified: user.is_verified,
          avatar: user.avatar,
          created_at: user.created_at,
        },
        stats: {
          totalShiftsThisWeek: parseInt(weekStats.total_shifts_this_week || 0),
          totalHoursThisWeek: parseFloat(parseFloat(weekStats.total_hours_this_week || 0).toFixed(1)),
          totalShiftsThisMonth: parseInt(monthStats.total_shifts_this_month || 0),
          totalHoursThisMonth: parseFloat(parseFloat(monthStats.total_hours_this_month || 0).toFixed(1)),
          estimatedSalary: estimatedSalary,
          totalWorkplaces: parseInt(workplacesResult.rows[0]?.total_workplaces || 0),
          upcomingShifts: upcomingShiftsResult.rows,
          upcomingShiftsCount: upcomingShiftsResult.rows.length,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi tải dashboard: " + error.message
    });
  }
};

module.exports = { getDashboardData };