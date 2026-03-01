const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// GET /api/leave
const getAllLeaveRequests = async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('leave_requests')
                .select('*, employees(first_name, last_name, department)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData = data.map(l => ({
                ...l,
                first_name: l.employees.first_name,
                last_name: l.employees.last_name,
                department: l.employees.department
            }));

            res.json({ success: true, data: mappedData });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.all(`
            SELECT l.*, e.first_name, e.last_name, e.department
            FROM leave_requests l
            JOIN employees e ON l.employee_id = e.employee_id
            ORDER BY l.created_at DESC
        `, [], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
    }
};

// POST /api/leave
const createLeaveRequest = async (req, res) => {
    const { employee_id, type, start_date, end_date, reason } = req.body;

    if (!employee_id || !type || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('leave_requests')
                .insert([{ employee_id, type, start_date, end_date, reason }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ success: true, message: 'Leave request submitted.', id: data.id });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            `INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)`,
            [employee_id, type, start_date, end_date, reason],
            function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.status(201).json({ success: true, message: 'Leave request submitted.', id: this.lastID });
            }
        );
    }
};

// PUT /api/leave/:id/status
const updateLeaveStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    if (supabase) {
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true, message: `Leave request ${status.toLowerCase()}.` });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            `UPDATE leave_requests SET status = ? WHERE id = ?`,
            [status, id],
            function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, message: `Leave request ${status.toLowerCase()}.` });
            }
        );
    }
};

module.exports = { getAllLeaveRequests, createLeaveRequest, updateLeaveStatus };
