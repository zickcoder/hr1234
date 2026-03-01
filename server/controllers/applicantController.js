const { getDb, getSupabase } = require('../models/db');
const supabase = getSupabase();

// POST /api/applicants
const createApplicant = async (req, res) => {
    const {
        first_name, last_name, email, contact_number,
        position_applied, branch_location, resume_link,
        application_status, interview_score, notes
    } = req.body;

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' });
    }

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('applicants')
                .insert([{
                    first_name, last_name, email, contact_number: contact_number || null,
                    position_applied: position_applied || null, branch_location: branch_location || null,
                    resume_link: resume_link || null, application_status: application_status || 'Applied',
                    interview_score: interview_score || null, notes: notes || null
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({
                success: true,
                message: 'Applicant created successfully.',
                data: { applicant_id: data.applicant_id }
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.run(
            `INSERT INTO applicants 
          (first_name, last_name, email, contact_number, position_applied, branch_location,
           resume_link, application_status, interview_score, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                first_name, last_name, email,
                contact_number || null, position_applied || null, branch_location || null,
                resume_link || null, application_status || 'Applied',
                interview_score || null, notes || null
            ],
            function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.status(201).json({
                    success: true,
                    message: 'Applicant created successfully.',
                    data: { applicant_id: this.lastID }
                });
            }
        );
    }
};

// GET /api/applicants
const getAllApplicants = async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.all(
            'SELECT * FROM applicants ORDER BY created_at DESC',
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, data: rows });
            }
        );
    }
};

// GET /api/applicants/:id
const getApplicant = async (req, res) => {
    const { id } = req.params;
    if (supabase) {
        try {
            const { data, error } = await supabase.from('applicants').select('*').eq('applicant_id', id).single();
            if (error || !data) return res.status(404).json({ success: false, message: 'Applicant not found.' });
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT * FROM applicants WHERE applicant_id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) return res.status(404).json({ success: false, message: 'Applicant not found.' });
            res.json({ success: true, data: row });
        });
    }
};

// PUT /api/applicants/:id
const updateApplicant = async (req, res) => {
    const { id } = req.params;
    const {
        first_name, last_name, email, contact_number,
        position_applied, branch_location, resume_link,
        application_status, interview_score, notes
    } = req.body;

    if (supabase) {
        try {
            const { error } = await supabase
                .from('applicants')
                .update({
                    first_name, last_name, email, contact_number,
                    position_applied, branch_location, resume_link,
                    application_status, interview_score, notes,
                    updated_at: new Date().toISOString()
                })
                .eq('applicant_id', id);

            if (error) return res.status(500).json({ success: false, message: error.message });
            res.json({ success: true, message: 'Applicant updated successfully.' });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT applicant_id FROM applicants WHERE applicant_id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) return res.status(404).json({ success: false, message: 'Applicant not found.' });

            db.run(
                `UPDATE applicants SET
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email),
            contact_number = COALESCE(?, contact_number),
            position_applied = COALESCE(?, position_applied),
            branch_location = COALESCE(?, branch_location),
            resume_link = COALESCE(?, resume_link),
            application_status = COALESCE(?, application_status),
            interview_score = COALESCE(?, interview_score),
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
           WHERE applicant_id = ?`,
                [
                    first_name, last_name, email, contact_number,
                    position_applied, branch_location, resume_link,
                    application_status, interview_score, notes, id
                ],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: err.message });
                    res.json({ success: true, message: 'Applicant updated successfully.' });
                }
            );
        });
    }
};

// DELETE /api/applicants/:id
const deleteApplicant = async (req, res) => {
    const { id } = req.params;
    if (supabase) {
        try {
            const { error } = await supabase.from('applicants').delete().eq('applicant_id', id);
            if (error) return res.status(500).json({ success: false, message: error.message });
            res.json({ success: true, message: 'Applicant deleted successfully.' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();
        db.get('SELECT applicant_id FROM applicants WHERE applicant_id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) return res.status(404).json({ success: false, message: 'Applicant not found.' });

            db.run('DELETE FROM applicants WHERE applicant_id = ?', [id], function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, message: 'Applicant deleted successfully.' });
            });
        });
    }
};

// POST /api/applicants/:id/hire
const hireApplicant = async (req, res) => {
    const { id } = req.params;

    if (supabase) {
        try {
            const { data: applicant, error: appErr } = await supabase.from('applicants').select('*').eq('applicant_id', id).single();
            if (appErr || !applicant) return res.status(404).json({ success: false, message: 'Applicant not found.' });

            if (applicant.application_status === 'Hired') {
                return res.status(409).json({ success: false, message: 'Applicant already hired.' });
            }
            if (applicant.application_status !== 'Passed') {
                return res.status(400).json({ success: false, message: 'Status must be "Passed" to hire.' });
            }

            const { data: existing } = await supabase.from('employees').select('employee_id').eq('email', applicant.email).single();
            if (existing) return res.status(409).json({ success: false, message: 'Employee with this email already exists.' });

            const today = new Date().toISOString().split('T')[0];
            const { data: newEmp, error: insErr } = await supabase
                .from('employees')
                .insert([{
                    first_name: applicant.first_name, last_name: applicant.last_name, email: applicant.email,
                    contact_number: applicant.contact_number, position: applicant.position_applied,
                    branch_location: applicant.branch_location, employment_status: 'Probationary', date_hired: today
                }])
                .select()
                .single();

            if (insErr) throw insErr;

            await supabase.from('applicants').update({ application_status: 'Hired', hired_as_employee_id: newEmp.employee_id }).eq('applicant_id', id);

            res.status(201).json({
                success: true,
                message: `${applicant.first_name} has been hired.`,
                data: { employee_id: newEmp.employee_id, applicant_id: id }
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    } else {
        const db = getDb();

        db.get('SELECT * FROM applicants WHERE applicant_id = ?', [id], (err, applicant) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found.' });

            // Prevent duplicate hiring
            if (applicant.application_status === 'Hired') {
                return res.status(409).json({
                    success: false,
                    message: 'Applicant has already been hired.',
                    data: { hired_as_employee_id: applicant.hired_as_employee_id }
                });
            }

            // Only allow hiring if status is 'Passed'
            if (applicant.application_status !== 'Passed') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot hire applicant with status "${applicant.application_status}". Status must be "Passed".`
                });
            }

            // Check if email already exists in employees
            db.get('SELECT employee_id FROM employees WHERE email = ?', [applicant.email], (err, existing) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                if (existing) {
                    return res.status(409).json({
                        success: false,
                        message: 'An employee with this email already exists.',
                        data: { employee_id: existing.employee_id }
                    });
                }

                const today = new Date().toISOString().split('T')[0];

                // Insert into employees
                db.run(
                    `INSERT INTO employees 
              (first_name, last_name, email, contact_number, position, branch_location, employment_status, date_hired)
             VALUES (?, ?, ?, ?, ?, ?, 'Probationary', ?)`,
                    [
                        applicant.first_name, applicant.last_name, applicant.email,
                        applicant.contact_number, applicant.position_applied,
                        applicant.branch_location, today
                    ],
                    function (err) {
                        if (err) return res.status(500).json({ success: false, message: err.message });

                        const newEmployeeId = this.lastID;

                        // Mark applicant as Hired
                        db.run(
                            `UPDATE applicants SET application_status = 'Hired', hired_as_employee_id = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE applicant_id = ?`,
                            [newEmployeeId, id],
                            function (err) {
                                if (err) return res.status(500).json({ success: false, message: err.message });
                                res.status(201).json({
                                    success: true,
                                    message: `${applicant.first_name} ${applicant.last_name} has been hired and added to employees.`,
                                    data: {
                                        employee_id: newEmployeeId,
                                        applicant_id: parseInt(id),
                                        employment_status: 'Probationary'
                                    }
                                });
                            }
                        );
                    }
                );
            });
        });
    }
};

module.exports = {
    createApplicant,
    getAllApplicants,
    getApplicant,
    updateApplicant,
    deleteApplicant,
    hireApplicant
};
