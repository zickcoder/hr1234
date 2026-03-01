const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// POST /api/training
const createTraining = async (req, res) => {
    const { title, description, type } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });

    if (supabase) {
        try {
            const { data, error } = await supabase.from('training_programs').insert([{ title, description, type: type || 'Optional' }]).select().single();
            if (error) throw error;
            res.status(201).json({ success: true, message: 'Training program created.', id: data.id });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            'INSERT INTO training_programs (title, description, type) VALUES (?, ?, ?)',
            [title, description, type || 'Optional'],
            function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.status(201).json({ success: true, message: 'Training program created.', id: this.lastID });
            }
        );
    }
};

// GET /api/training
const getAllTraining = async (req, res) => {
    if (supabase) {
        try {
            const { data: programs, error: progErr } = await supabase.from('training_programs').select('*').order('created_at', { ascending: false });
            if (progErr) throw progErr;

            const { data: enrollments, error: enrErr } = await supabase.from('employee_training').select('*, employees(first_name, last_name, department)');
            if (enrErr) throw enrErr;

            const mappedData = programs.map(prog => ({
                ...prog,
                enrollments: enrollments.filter(e => e.training_id === prog.id).map(e => ({
                    ...e,
                    first_name: e.employees.first_name,
                    last_name: e.employees.last_name,
                    department: e.employees.department
                }))
            }));

            res.json({ success: true, data: mappedData });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.all('SELECT * FROM training_programs ORDER BY created_at DESC', [], (err, programs) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            db.all(`
          SELECT 
            et.*, e.first_name, e.last_name, e.department
          FROM employee_training et
          JOIN employees e ON et.employee_id = e.employee_id
        `, [], (err, enrollments) => {
                if (err) return res.status(500).json({ success: false, message: err.message });

                const data = programs.map(prog => ({
                    ...prog,
                    enrollments: enrollments.filter(e => e.training_id === prog.id)
                }));

                res.json({ success: true, data });
            });
        });
    }
};

// POST /api/training/assign
const assignTraining = async (req, res) => {
    const { employee_id, training_id } = req.body;
    if (!employee_id || !training_id) return res.status(400).json({ success: false, message: 'Employee ID and Training ID required.' });

    if (supabase) {
        try {
            const { data, error } = await supabase.from('employee_training').insert([{ employee_id, training_id, status: 'Enrolled' }]).select().single();
            if (error) {
                if (error.code === '23505') return res.status(400).json({ success: false, message: 'Already enrolled.' });
                throw error;
            }
            res.json({ success: true, message: 'Training assigned successfully.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            `INSERT INTO employee_training (employee_id, training_id, status) VALUES (?, ?, 'Enrolled')`,
            [employee_id, training_id],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Employee is already enrolled.' });
                    return res.status(500).json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Training assigned successfully.' });
            }
        );
    }
};

// PUT /api/training/:id/complete
const completeTraining = async (req, res) => {
    const { id } = req.params;
    const { certificate_link } = req.body;

    if (supabase) {
        try {
            const { error } = await supabase
                .from('employee_training')
                .update({ status: 'Completed', completion_date: new Date().toISOString(), certificate_link })
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true, message: 'Training marked as completed.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            `UPDATE employee_training 
         SET status = 'Completed', completion_date = CURRENT_TIMESTAMP, certificate_link = ? 
         WHERE id = ?`,
            [certificate_link, id],
            function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                if (this.changes === 0) return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
                res.json({ success: true, message: 'Training marked as completed.' });
            }
        );
    }
};

// GET /api/training/enrollments
const getEnrollments = async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('employee_training').select('*, training_programs(title), employees(first_name, last_name)');
            if (error) throw error;

            const mappedData = data.map(e => ({
                ...e,
                title: e.training_programs.title,
                first_name: e.employees.first_name,
                last_name: e.employees.last_name
            }));

            res.json({ success: true, data: mappedData });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.all(`
            SELECT et.*, tp.title, e.first_name, e.last_name
            FROM employee_training et
            JOIN training_programs tp ON et.training_id = tp.id
            JOIN employees e ON et.employee_id = e.employee_id
        `, [], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
    }
};

module.exports = { createTraining, getAllTraining, assignTraining, completeTraining, getEnrollments };
