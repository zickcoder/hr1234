const seedData = {
    employees: [
        {
            employee_id: 1,
            first_name: "Juan",
            last_name: "Dela Cruz",
            email: "juan@hr.com",
            department: "Operations",
            position: "Driver",
            employment_status: "Regular",
            date_hired: "2024-01-15",
            branch_location: "Manila Hub",
            is_active: 1
        },
        {
            employee_id: 2,
            first_name: "Jocath",
            last_name: "Tugas",
            email: "jocathgaslang@gmail.com",
            contact_number: "113",
            department: null,
            position: "Laborer",
            employment_status: "Probationary",
            date_hired: "2026-02-26",
            branch_location: "Manila Hub",
            is_active: 0
        },
        {
            employee_id: 3,
            first_name: "Maria",
            last_name: "Santos",
            email: "maria@test.com",
            department: null,
            position: "Manager",
            employment_status: "Probationary",
            date_hired: "2026-02-26",
            branch_location: "Cebu Hub",
            is_active: 1
        }
    ],
    users: [
        {
            name: "Super Admin",
            email: "admin@gmail.com",
            password_hash: "$2a$10$nFMk99pBm/oLBbbrGFObIebr8l6k9XCZUop2B.YigMv0jdyqwmezsrC",
            role: "SuperAdmin",
            employee_id: null
        },
        {
            name: "HR Admin",
            email: "hr@company.com",
            password_hash: "$2a$10$dZrMGApE629sadZM5HLdYuWPmuf2zd9QWYhNmn8jo.Mu.SzNZMki2",
            role: "HRAdmin",
            employee_id: null
        },
        {
            name: "Maria Santos",
            email: "maria@test.com",
            password_hash: "$2a$10$epixmO32bsbkC2EtonvNSuMSdgS6Evasv3igMv9ntWp3StMSKISjofeuK",
            role: "Employee",
            employee_id: 3
        }
    ]
};

module.exports = seedData;
