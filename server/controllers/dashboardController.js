const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// Helper to wrap db.get in a promise for async/await
const dbGet = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDb().get(query, params, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDb().all(query, params, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

// GET /api/dashboard/summary
const getSummary = async (req, res) => {
    if (supabase) {
        try {
            const { count: total_employees } = await supabase.from('employees').select('*', { count: 'exact', head: true });
            const { count: active_employees } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true);
            const { count: total_applicants } = await supabase.from('applicants').select('*', { count: 'exact', head: true });

            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { count: hired_this_month } = await supabase.from('employees').select('*', { count: 'exact', head: true }).gte('date_hired', firstDayOfMonth);

            const thisMonth = new Date().getMonth() + 1;
            const thisYear = new Date().getFullYear();
            const { data: payrollData } = await supabase.from('payroll').select('net_salary').eq('month', thisMonth).eq('year', thisYear);
            const monthly_payroll_total = payrollData ? payrollData.reduce((acc, curr) => acc + curr.net_salary, 0) : 0;

            res.json({
                success: true,
                data: {
                    total_employees: total_employees || 0,
                    active_employees: active_employees || 0,
                    total_applicants: total_applicants || 0,
                    hired_this_month: hired_this_month || 0,
                    employees_on_leave: 0,
                    monthly_payroll_total
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        try {
            const total_employees = await dbGet('SELECT COUNT(*) as count FROM employees');
            const active_employees = await dbGet('SELECT COUNT(*) as count FROM employees WHERE is_active = 1');
            const total_applicants = await dbGet('SELECT COUNT(*) as count FROM applicants');

            const currentMonth = new Date().toISOString().substring(0, 7) + '%';
            const hired_this_month = await dbGet('SELECT COUNT(*) as count FROM employees WHERE date_hired LIKE ? OR created_at LIKE ?', [currentMonth, currentMonth]);

            // MVP: No leave module built, hardcode to 0 for now to prevent breaking, or assume 0
            const employees_on_leave = { count: 0 };

            // Monthly payroll total for current month
            const thisMonth = new Date().getMonth() + 1;
            const thisYear = new Date().getFullYear();
            const monthly_payroll_total = await dbGet('SELECT SUM(net_salary) as total FROM payroll WHERE month = ? AND year = ?', [thisMonth, thisYear]);

            res.json({
                success: true,
                data: {
                    total_employees: total_employees.count,
                    active_employees: active_employees.count,
                    total_applicants: total_applicants.count,
                    hired_this_month: hired_this_month.count,
                    employees_on_leave: employees_on_leave.count,
                    monthly_payroll_total: monthly_payroll_total.total || 0
                }
            });

        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

// GET /api/dashboard/hiring-trend
const getHiringTrend = async (req, res) => {
    if (supabase) {
        try {
            // In Supabase (Postgres), we use to_char or similar
            const { data, error } = await supabase.rpc('get_hiring_trend');
            // If the user hasn't added the RPC yet, we can try a raw select or fallback
            if (error) {
                // simple fallback logic for trend
                const { data: trendData } = await supabase.from('employees').select('created_at');
                const counts = {};
                trendData.forEach(e => {
                    const m = e.created_at.substring(0, 7);
                    counts[m] = (counts[m] || 0) + 1;
                });
                const result = Object.entries(counts).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
                return res.json({ success: true, data: result });
            }
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        try {
            // Group by month created using SQLite strftime
            const rows = await dbAll(`
          SELECT 
            strftime('%Y-%m', created_at) as month, 
            COUNT(*) as count 
          FROM employees 
          GROUP BY strftime('%Y-%m', created_at)
          ORDER BY month ASC
          LIMIT 6
        `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

// GET /api/dashboard/attendance-overview
const getAttendanceOverview = async (req, res) => {
    try {
        // MVP: No attendance module built, return mock zero data so the frontend doesn't crash
        res.json({ success: true, data: { present: 100, absent: 0, leave: 0 } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/dashboard/payroll-trend
const getPayrollTrend = async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('payroll')
                .select('year, month, net_salary, gross_salary')
                .order('year', { ascending: true })
                .order('month', { ascending: true })
                .limit(6);

            if (error) throw error;

            // Group by month/year manually if needed or return aggregated rows
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        try {
            const rows = await dbAll(`
          SELECT 
            year, month, 
            SUM(net_salary) as total_net, 
            SUM(gross_salary) as total_gross 
          FROM payroll 
          GROUP BY year, month 
          ORDER BY year ASC, month ASC 
          LIMIT 6
        `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

// GET /api/dashboard/training-completion
const getTrainingCompletion = async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('employee_training').select('status');
            if (error) throw error;

            const counts = {};
            data.forEach(d => {
                counts[d.status] = (counts[d.status] || 0) + 1;
            });
            const result = Object.entries(counts).map(([status, count]) => ({ status, count }));
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        try {
            const rows = await dbAll(`
          SELECT 
            status, 
            COUNT(*) as count 
          FROM employee_training 
          GROUP BY status
        `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = {
    getSummary,
    getHiringTrend,
    getAttendanceOverview,
    getPayrollTrend,
    getTrainingCompletion
};
