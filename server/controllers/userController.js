const bcrypt = require('bcryptjs');
const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();
const crypto = require('crypto');

const generateSecurePassword = (length = 12) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";

    // Ensure at least one of each required type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[crypto.randomInt(26)];
    password += "abcdefghijklmnopqrstuvwxyz"[crypto.randomInt(26)];
    password += "0123456789"[crypto.randomInt(10)];
    password += "!@#$%^&*()_+"[crypto.randomInt(12)];

    for (let i = password.length; i < length; i++) {
        password += charset[crypto.randomInt(charset.length)];
    }

    // Shuffle
    return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// POST /api/users/create-employee-account
const createEmployeeAccount = async (req, res) => {
    const { employee_id, email } = req.body;

    if (!employee_id || !email) {
        return res.status(400).json({ success: false, message: 'employee_id and email are required.' });
    }

    const password = generateSecurePassword(14);
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    if (supabase) {
        try {
            // 1. Check if employee exists
            const { data: employee, error: empErr } = await supabase.from('employees').select('first_name, last_name').eq('employee_id', employee_id).single();
            if (empErr || !employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

            // 2. Check if employee already has a user account
            const { data: existingUser } = await supabase.from('users').select('id').eq('employee_id', employee_id).single();
            if (existingUser) return res.status(400).json({ success: false, message: 'This employee already has an account.' });

            // 3. Check duplicate email
            const { data: emailExists } = await supabase.from('users').select('id').eq('email', email).single();
            if (emailExists) return res.status(409).json({ success: false, message: 'Email already in use.' });

            // 4. Create account
            const name = `${employee.first_name} ${employee.last_name}`;
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    name,
                    email,
                    password_hash,
                    role: 'Employee',
                    employee_id,
                    temporary_password: password
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({
                success: true,
                message: 'Employee account created successfully.',
                data: { id: data.id, password }
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT first_name, last_name FROM employees WHERE employee_id = ?', [employee_id], (err, employee) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

            db.get('SELECT id FROM users WHERE employee_id = ?', [employee_id], (err, existingUser) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                if (existingUser) return res.status(400).json({ success: false, message: 'This employee already has an account.' });

                db.get('SELECT id FROM users WHERE email = ?', [email], (err, emailExists) => {
                    if (err) return res.status(500).json({ success: false, message: err.message });
                    if (emailExists) return res.status(409).json({ success: false, message: 'Email already in use.' });

                    const name = `${employee.first_name} ${employee.last_name}`;
                    db.run(
                        'INSERT INTO users (name, email, password_hash, role, employee_id, temporary_password) VALUES (?, ?, ?, ?, ?, ?)',
                        [name, email, password_hash, 'Employee', employee_id, password],
                        function (err) {
                            if (err) return res.status(500).json({ success: false, message: err.message });
                            res.status(201).json({
                                success: true,
                                message: 'Employee account created successfully.',
                                data: { id: this.lastID, password }
                            });
                        }
                    );
                });
            });
        });
    }
};

module.exports = { createEmployeeAccount };
