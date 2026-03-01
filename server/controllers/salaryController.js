const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// POST /api/salary
const createOrUpdateSalary = async (req, res) => {
    const { employee_id, basic_salary, allowance, deduction_per_absence } = req.body;

    if (!employee_id || basic_salary === undefined) {
        return res.status(400).json({ success: false, message: 'Employee ID and Basic Salary are required.' });
    }

    if (supabase) {
        try {
            const { data: emp } = await supabase.from('employees').select('employee_id').eq('employee_id', employee_id).single();
            if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });

            const { error } = await supabase
                .from('salary_structure')
                .upsert({
                    employee_id,
                    basic_salary,
                    allowance: allowance || 0,
                    deduction_per_absence: deduction_per_absence || 0,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'employee_id' });

            if (error) throw error;
            res.json({ success: true, message: 'Salary structure updated successfully.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT employee_id FROM employees WHERE employee_id = ?', [employee_id], (err, emp) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });

            db.get('SELECT id FROM salary_structure WHERE employee_id = ?', [employee_id], (err, existing) => {
                if (err) return res.status(500).json({ success: false, message: err.message });

                if (existing) {
                    db.run(
                        `UPDATE salary_structure SET
                basic_salary = ?,
                allowance = ?,
                deduction_per_absence = ?,
                updated_at = CURRENT_TIMESTAMP
               WHERE employee_id = ?`,
                        [basic_salary, allowance || 0, deduction_per_absence || 0, employee_id],
                        function (err) {
                            if (err) return res.status(500).json({ success: false, message: err.message });
                            res.json({ success: true, message: 'Salary structure updated successfully.' });
                        }
                    );
                } else {
                    db.run(
                        `INSERT INTO salary_structure (employee_id, basic_salary, allowance, deduction_per_absence)
               VALUES (?, ?, ?, ?)`,
                        [employee_id, basic_salary, allowance || 0, deduction_per_absence || 0],
                        function (err) {
                            if (err) return res.status(500).json({ success: false, message: err.message });
                            res.status(201).json({ success: true, message: 'Salary structure created successfully.' });
                        }
                    );
                }
            });
        });
    }
};

// GET /api/salary/:employee_id
const getSalary = async (req, res) => {
    const { employee_id } = req.params;
    if (supabase) {
        try {
            const { data, error } = await supabase.from('salary_structure').select('*').eq('employee_id', employee_id).single();
            if (error || !data) {
                return res.json({
                    success: true,
                    data: { employee_id: parseInt(employee_id), basic_salary: 0, allowance: 0, deduction_per_absence: 0 }
                });
            }
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT * FROM salary_structure WHERE employee_id = ?', [employee_id], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) {
                return res.json({
                    success: true,
                    data: { employee_id: parseInt(employee_id), basic_salary: 0, allowance: 0, deduction_per_absence: 0 }
                });
            }
            res.json({ success: true, data: row });
        });
    }
};

// GET /api/salary
const getAllSalaries = async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('employee_id, first_name, last_name, department, position, salary_structure(basic_salary, allowance, deduction_per_absence)')
                .eq('is_active', true)
                .order('first_name', { ascending: true });

            if (error) throw error;

            const mappedData = data.map(e => ({
                employee_id: e.employee_id,
                first_name: e.first_name,
                last_name: e.last_name,
                department: e.department,
                position: e.position,
                basic_salary: e.salary_structure ? e.salary_structure.basic_salary : 0,
                allowance: e.salary_structure ? e.salary_structure.allowance : 0,
                deduction_per_absence: e.salary_structure ? e.salary_structure.deduction_per_absence : 0
            }));

            res.json({ success: true, data: mappedData });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        const query = `
        SELECT 
          e.employee_id, e.first_name, e.last_name, e.department, e.position,
          COALESCE(s.basic_salary, 0) as basic_salary,
          COALESCE(s.allowance, 0) as allowance,
          COALESCE(s.deduction_per_absence, 0) as deduction_per_absence
        FROM employees e
        LEFT JOIN salary_structure s ON e.employee_id = s.employee_id
        WHERE e.is_active = 1
        ORDER BY e.first_name ASC
      `;
        db.all(query, [], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: rows });
        });
    }
};

module.exports = { createOrUpdateSalary, getSalary, getAllSalaries };
