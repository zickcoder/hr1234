const Database = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// Vercel read-only filesystem workaround
if (process.env.VERCEL) {
  const tempDbPath = path.join('/tmp', 'database.sqlite');
  if (!fs.existsSync(tempDbPath)) {
    try {
      fs.copyFileSync(DB_PATH, tempDbPath);
      console.log('Database copied to /tmp for write access.');
    } catch (err) {
      console.error('Failed to copy database to /tmp:', err.message);
    }
  }
  DB_PATH = tempDbPath;
}

let db;

function getDb() {
  if (!db) {
    db = new Database.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database.');
        initializeDatabase(db);
      }
    });
  }
  return db;
}

function initializeDatabase(db) {
  db.serialize(() => {
    // Attendance table
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time_in TEXT,
        time_out TEXT,
        status TEXT DEFAULT 'Present' CHECK(status IN ('Present', 'Absent', 'Late', 'Half-day')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
        UNIQUE(employee_id, date)
      )
    `, (err) => {
      if (err) console.error('Error creating attendance table:', err.message);
      else console.log('Attendance table ready.');
    });

    // Leave requests table
    db.run(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating leave_requests table:', err.message);
      else console.log('Leave requests table ready.');
    });

    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('SuperAdmin', 'HRAdmin', 'Employee')),
        employee_id INTEGER,
        temporary_password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL
      )
    `, (err) => {
      if (err) console.error('Error creating users table:', err.message);
      else console.log('Users table ready.');
    });

    // Employees table
    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        contact_number TEXT,
        department TEXT,
        position TEXT,
        employment_status TEXT DEFAULT 'Regular' CHECK(employment_status IN ('Regular', 'Probationary', 'Contractual', 'Part-time')),
        date_hired DATE,
        branch_location TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating employees table:', err.message);
      else console.log('Employees table ready.');
    });

    // Applicants table
    db.run(`
      CREATE TABLE IF NOT EXISTS applicants (
        applicant_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        contact_number TEXT,
        position_applied TEXT,
        branch_location TEXT,
        resume_link TEXT,
        application_status TEXT DEFAULT 'Applied' CHECK(application_status IN ('Applied', 'Interview', 'Passed', 'Rejected', 'Hired')),
        interview_score REAL,
        notes TEXT,
        hired_as_employee_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating applicants table:', err.message);
      else console.log('Applicants table ready.');
    });

    // Salary Structure table
    db.run(`
      CREATE TABLE IF NOT EXISTS salary_structure (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER UNIQUE NOT NULL,
        basic_salary REAL NOT NULL DEFAULT 0,
        allowance REAL NOT NULL DEFAULT 0,
        deduction_per_absence REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating salary_structure table:', err.message);
      else console.log('Salary Structure table ready.');
    });

    // Payroll table
    db.run(`
      CREATE TABLE IF NOT EXISTS payroll (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        days_worked INTEGER NOT NULL DEFAULT 0,
        absences INTEGER NOT NULL DEFAULT 0,
        gross_salary REAL NOT NULL DEFAULT 0,
        total_deductions REAL NOT NULL DEFAULT 0,
        net_salary REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Paid')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
        UNIQUE(employee_id, month, year)
      )
    `, (err) => {
      if (err) console.error('Error creating payroll table:', err.message);
      else console.log('Payroll table ready.');
    });

    // HR2: Training Programs
    db.run(`
      CREATE TABLE IF NOT EXISTS training_programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'Optional' CHECK(type IN ('Mandatory', 'Optional')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating training_programs table:', err.message);
      else console.log('Training Programs table ready.');
    });

    // HR2: Employee Training
    db.run(`
      CREATE TABLE IF NOT EXISTS employee_training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        training_id INTEGER NOT NULL,
        status TEXT DEFAULT 'Enrolled' CHECK(status IN ('Enrolled', 'Completed')),
        completion_date DATETIME,
        certificate_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
        FOREIGN KEY (training_id) REFERENCES training_programs(id) ON DELETE CASCADE,
        UNIQUE(employee_id, training_id)
      )
    `, (err) => {
      if (err) console.error('Error creating employee_training table:', err.message);
      else console.log('Employee Training table ready.');
    });

    // HR2: Competencies
    db.run(`
      CREATE TABLE IF NOT EXISTS competencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      )
    `, (err) => {
      if (err) console.error('Error creating competencies table:', err.message);
      else console.log('Competencies table ready.');
    });

    // HR2: Employee Competencies
    db.run(`
      CREATE TABLE IF NOT EXISTS employee_competencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        competency_id INTEGER NOT NULL,
        level TEXT DEFAULT 'Beginner' CHECK(level IN ('Beginner', 'Intermediate', 'Advanced')),
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
        FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE,
        UNIQUE(employee_id, competency_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating employee_competencies table:', err.message);
      } else {
        console.log('Employee Competencies table ready.');
        // Seed data if users table is empty
        seedDataIfEmpty(db);
      }
    });
  });
}

function seedDataIfEmpty(db) {
  db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) {
      console.error('Error checking users count:', err.message);
      return;
    }

    if (row.count === 0) {
      console.log('Database is empty. Seeding initial data...');
      const seedData = require('../seedData');

      db.serialize(() => {
        // Seed Employees
        const employeeStmt = db.prepare(`
          INSERT INTO employees (employee_id, first_name, last_name, email, contact_number, department, position, employment_status, date_hired, branch_location, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        seedData.employees.forEach(emp => {
          employeeStmt.run([emp.employee_id, emp.first_name, emp.last_name, emp.email, emp.contact_number, emp.department, emp.position, emp.employment_status, emp.date_hired, emp.branch_location, emp.is_active]);
        });
        employeeStmt.finalize();

        // Seed Users
        const userStmt = db.prepare(`
          INSERT INTO users (name, email, password_hash, role, employee_id, temporary_password)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        seedData.users.forEach(user => {
          userStmt.run([user.name, user.email, user.password_hash, user.role, user.employee_id, user.temporary_password || null]);
        });
        userStmt.finalize();

        console.log('Seeding completed successfully.');
      });
    }
  });
}

module.exports = { getDb };
