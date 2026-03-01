const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// POST /api/competencies
const createCompetency = async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Competency name is required.' });

    if (supabase) {
        try {
            const { data, error } = await supabase.from('competencies').insert([{ name, description }]).select().single();
            if (error) {
                if (error.code === '23505') return res.status(400).json({ success: false, message: 'Competency already exists.' });
                throw error;
            }
            res.status(201).json({ success: true, message: 'Competency created.', id: data.id });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            'INSERT INTO competencies (name, description) VALUES (?, ?)',
            [name, description],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Competency already exists.' });
                    return res.status(500).json({ success: false, message: err.message });
                }
                res.status(201).json({ success: true, message: 'Competency created.', id: this.lastID });
            }
        );
    }
};

// GET /api/competencies
const getAllCompetencies = async (req, res) => {
    if (supabase) {
        try {
            const { data: comps, error: compErr } = await supabase.from('competencies').select('*').order('name', { ascending: true });
            if (compErr) throw compErr;

            const { data: assignments, error: assErr } = await supabase
                .from('employee_competencies')
                .select('*, employees(first_name, last_name, department, position)');
            if (assErr) throw assErr;

            const mappedData = comps.map(comp => ({
                ...comp,
                employees: assignments ? assignments.filter(a => a.competency_id === comp.id).map(a => ({
                    ...a,
                    first_name: a.employees.first_name,
                    last_name: a.employees.last_name,
                    department: a.employees.department,
                    position: a.employees.position
                })) : []
            }));

            res.json({ success: true, data: mappedData });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.all('SELECT * FROM competencies ORDER BY name ASC', [], (err, comps) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            db.all(`
          SELECT 
            ec.*, e.first_name, e.last_name, e.department, e.position
          FROM employee_competencies ec
          JOIN employees e ON ec.employee_id = e.employee_id
        `, [], (err, assignments) => {
                if (err) return res.status(500).json({ success: false, message: err.message });

                const data = comps.map(comp => ({
                    ...comp,
                    employees: assignments ? assignments.filter(a => a.competency_id === comp.id) : []
                }));

                res.json({ success: true, data });
            });
        });
    }
};

// POST /api/competencies/assign
const assignCompetency = async (req, res) => {
    const { employee_id, competency_id, level } = req.body;

    if (!employee_id || !competency_id || !level) {
        return res.status(400).json({ success: false, message: 'Employee ID, Competency ID, and Level required.' });
    }

    const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
    if (!validLevels.includes(level)) {
        return res.status(400).json({ success: false, message: 'Invalid competency level.' });
    }

    if (supabase) {
        try {
            // Check existence first for upsert simulation or use upsert
            const { error } = await supabase
                .from('employee_competencies')
                .upsert({ employee_id, competency_id, level }, { onConflict: 'employee_id,competency_id' });

            if (error) throw error;
            res.json({ success: true, message: 'Competency level assigned/updated successfully.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            `INSERT INTO employee_competencies (employee_id, competency_id, level) 
         VALUES (?, ?, ?)
         ON CONFLICT(employee_id, competency_id) DO UPDATE SET level = ?`,
            [employee_id, competency_id, level, level],
            function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, message: 'Competency level assigned/updated successfully.' });
            }
        );
    }
};

module.exports = { createCompetency, getAllCompetencies, assignCompetency };
