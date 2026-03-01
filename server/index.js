require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./models/db');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const applicantRoutes = require('./routes/applicants');
const salaryRoutes = require('./routes/salary');
const payrollRoutes = require('./routes/payroll');
const trainingRoutes = require('./routes/training');
const competencyRoutes = require('./routes/competency');
const dashboardRoutes = require('./routes/dashboard');
const meRoutes = require('./routes/me');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize DB on startup
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/competencies', competencyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/me', meRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'HR System API is running.', timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`HR System Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
