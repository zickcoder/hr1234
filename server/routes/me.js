const express = require('express');
const router = express.Router();
const { getDb, getSupabase } = require('../models/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const supabase = getSupabase();

// All routes require Employee role
router.use(authenticateToken);
router.use(requireRole('Employee'));

// Helper query function for SQLite
const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDb().all(query, params, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const dbGet = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDb().get(query, params, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

// GET /api/me (Profile)
router.get('/', async (req, res) => {
    try {
        const employeeId = req.user.employee_id;
        if (!employeeId) return res.status(400).json({ success: false, message: 'No employee ID.' });

        if (supabase) {
            const { data, error } = await supabase.from('employees').select('*').eq('employee_id', employeeId).single();
            if (error || !data) return res.status(404).json({ success: false, message: 'Profile not found.' });
            res.json({ success: true, data });
        } else {
            const profile = await dbGet('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
            if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
            res.json({ success: true, data: profile });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/me/attendance
router.get('/attendance', async (req, res) => {
    try {
        const employeeId = req.user.employee_id;
        if (!employeeId) return res.status(400).json({ success: false, message: 'No employee ID.' });

        if (supabase) {
            const { data, error } = await supabase.from('attendance').select('*').eq('employee_id', employeeId).order('date', { ascending: false });
            if (error) throw error;
            res.json({ success: true, data });
        } else {
            const records = await dbAll('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC', [employeeId]);
            res.json({ success: true, data: records });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/me/leave
router.get('/leave', async (req, res) => {
    try {
        const employeeId = req.user.employee_id;
        if (!employeeId) return res.status(400).json({ success: false, message: 'No employee ID.' });

        if (supabase) {
            const { data, error } = await supabase.from('leave_requests').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false });
            if (error) throw error;
            res.json({ success: true, data });
        } else {
            const records = await dbAll('SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY created_at DESC', [employeeId]);
            res.json({ success: true, data: records });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/me/payroll
router.get('/payroll', async (req, res) => {
    try {
        const employeeId = req.user.employee_id;
        if (!employeeId) return res.status(400).json({ success: false, message: 'No employee ID.' });

        if (supabase) {
            const { data, error } = await supabase.from('payroll').select('*').eq('employee_id', employeeId).order('year', { ascending: false }).order('month', { ascending: false });
            if (error) throw error;
            res.json({ success: true, data });
        } else {
            const records = await dbAll('SELECT * FROM payroll WHERE employee_id = ? ORDER BY year DESC, month DESC', [employeeId]);
            res.json({ success: true, data: records });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
