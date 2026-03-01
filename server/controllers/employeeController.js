const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// POST /api/employees
const createEmployee = async (req, res) => {
    const {
        first_name, last_name, email, contact_number,
        department, position, employment_status, date_hired, branch_location
    } = req.body;

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ success: false, message: 'First name, last name and email are required.' });
    }

    if (supabase) {
        try {
            const { data: existing } = await supabase.from('employees').select('employee_id').eq('email', email).single();
            if (existing) return res.status(409).json({ success: false, message: 'Employee with this email already exists.' });

            const { data, error } = await supabase
                .from('employees')
                .insert([{
                    first_name, last_name, email, contact_number: contact_number || null,
                    department: department || null, position: position || null,
                    employment_status: employment_status || 'Regular', date_hired: date_hired || null,
                    branch_location: branch_location || null
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({
                success: true,
                message: 'Employee created successfully.',
                data: { employee_id: data.employee_id }
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT employee_id FROM employees WHERE email = ?', [email], (err, existing) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (existing) return res.status(409).json({ success: false, message: 'Employee with this email already exists.' });

            db.run(
                `INSERT INTO employees 
            (first_name, last_name, email, contact_number, department, position, employment_status, date_hired, branch_location)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [first_name, last_name, email, contact_number || null, department || null,
                    position || null, employment_status || 'Regular', date_hired || null, branch_location || null],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: err.message });
                    res.status(201).json({
                        success: true,
                        message: 'Employee created successfully.',
                        data: { employee_id: this.lastID }
                    });
                }
            );
        });
    }
};

// GET /api/employees
const getAllEmployees = async (req, res) => {
    if (supabase) {
        try {
            // Join with users in Supabase
            const { data, error } = await supabase
                .from('employees')
                .select('*, users(id, email, temporary_password)')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData = data.map(emp => ({
                ...emp,
                user_id: emp.users ? emp.users.id : null,
                user_email: emp.users ? emp.users.email : null,
                temporary_password: emp.users ? emp.users.temporary_password : null,
                has_account: !!emp.users
            }));

            res.json({ success: true, data: mappedData });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.all(
            `SELECT e.*, u.id as user_id, u.email as user_email, u.temporary_password 
             FROM employees e
             LEFT JOIN users u ON e.employee_id = u.employee_id
             WHERE e.is_active = 1 
             ORDER BY e.created_at DESC`,
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ success: false, message: err.message });

                // Map rows to include has_account flag
                const data = rows.map(emp => ({
                    ...emp,
                    has_account: !!emp.user_id
                }));

                res.json({ success: true, data });
            }
        );
    }
};

// GET /api/employees/:id
const getEmployee = async (req, res) => {
    const { id } = req.params;
    if (supabase) {
        try {
            const { data, error } = await supabase.from('employees').select('*').eq('employee_id', id).single();
            if (error || !data) return res.status(404).json({ success: false, message: 'Employee not found.' });
            res.json({ success: true, data });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT * FROM employees WHERE employee_id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) return res.status(404).json({ success: false, message: 'Employee not found.' });
            res.json({ success: true, data: row });
        });
    }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const {
        first_name, last_name, email, contact_number,
        department, position, employment_status, date_hired, branch_location
    } = req.body;

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('employees')
                .update({
                    first_name, last_name, email, contact_number,
                    department, position, employment_status, date_hired, branch_location,
                    updated_at: new Date().toISOString()
                })
                .eq('employee_id', id);

            if (error) return res.status(500).json({ success: false, message: error.message });
            res.json({ success: true, message: 'Employee updated successfully.' });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT employee_id FROM employees WHERE employee_id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) return res.status(404).json({ success: false, message: 'Employee not found.' });

            db.run(
                `UPDATE employees SET
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email),
            contact_number = COALESCE(?, contact_number),
            department = COALESCE(?, department),
            position = COALESCE(?, position),
            employment_status = COALESCE(?, employment_status),
            date_hired = COALESCE(?, date_hired),
            branch_location = COALESCE(?, branch_location),
            updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = ?`,
                [first_name, last_name, email, contact_number, department,
                    position, employment_status, date_hired, branch_location, id],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: err.message });
                    res.json({ success: true, message: 'Employee updated successfully.' });
                }
            );
        });
    }
};

// DELETE /api/employees/:id  (soft delete)
const deleteEmployee = async (req, res) => {
    const { id } = req.params;
    if (supabase) {
        try {
            const { error } = await supabase
                .from('employees')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('employee_id', id);

            if (error) return res.status(500).json({ success: false, message: error.message });
            res.json({ success: true, message: 'Employee deactivated successfully.' });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT employee_id FROM employees WHERE employee_id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) return res.status(404).json({ success: false, message: 'Employee not found.' });

            db.run(
                'UPDATE employees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?',
                [id],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: err.message });
                    res.json({ success: true, message: 'Employee deactivated successfully.' });
                }
            );
        });
    }
};

module.exports = { createEmployee, getAllEmployees, getEmployee, updateEmployee, deleteEmployee };
