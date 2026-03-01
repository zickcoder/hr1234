const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// POST /api/auth/register
const register = async (req, res) => {
    const { name, email, password, role, employee_id } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const allowedRoles = ['SuperAdmin', 'HRAdmin', 'Employee'];
    const userRole = role && allowedRoles.includes(role) ? role : 'HRAdmin';

    if (userRole === 'Employee' && !employee_id) {
        return res.status(400).json({ success: false, message: 'employee_id is required for Employee role.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    if (supabase) {
        try {
            // Check if any user exists
            const { count, error: countErr } = await supabase.from('users').select('*', { count: 'exact', head: true });
            if (countErr) throw countErr;

            const finalRole = count === 0 ? 'SuperAdmin' : userRole;

            const { data, error } = await supabase
                .from('users')
                .insert([{
                    name,
                    email,
                    password_hash: hash,
                    role: finalRole,
                    employee_id: finalRole === 'Employee' ? employee_id : null
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') return res.status(409).json({ success: false, message: 'Email already registered.' });
                throw error;
            }

            return res.status(201).json({
                success: true,
                message: `User registered successfully as ${finalRole}.`,
                data: { id: data.id, name: data.name, email: data.email, role: data.role, employee_id: data.employee_id }
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        // Check if any user exists (first user must be SuperAdmin)
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            const isFirstUser = row.count === 0;
            const finalRole = isFirstUser ? 'SuperAdmin' : userRole;

            // Check duplicate email
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, existing) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

                db.run(
                    'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES (?, ?, ?, ?, ?)',
                    [name, email, hash, finalRole, finalRole === 'Employee' ? employee_id : null],
                    function (err) {
                        if (err) return res.status(500).json({ success: false, message: err.message });
                        res.status(201).json({
                            success: true,
                            message: `User registered successfully as ${finalRole}.`,
                            data: { id: this.lastID, name, email, role: finalRole, employee_id: finalRole === 'Employee' ? employee_id : null }
                        });
                    }
                );
            });
        });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    if (supabase) {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

            const isValid = bcrypt.compareSync(password, user.password_hash);
            if (!isValid) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

            const token = jwt.sign(
                { id: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            return res.json({
                success: true,
                message: 'Login successful.',
                data: {
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id }
                }
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

            const isValid = bcrypt.compareSync(password, user.password_hash);
            if (!isValid) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

            const token = jwt.sign(
                { id: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.json({
                success: true,
                message: 'Login successful.',
                data: {
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id }
                }
            });
        });
    }
};

// GET /api/auth/me
const getMe = (req, res) => {
    res.json({ success: true, data: req.user });
};

module.exports = { register, login, getMe };
