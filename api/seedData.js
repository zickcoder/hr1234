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
        },
        {
            employee_id: 4,
            first_name: "Jocath",
            last_name: "asdasd",
            email: "jocath@gmail.com",
            contact_number: "",
            department: null,
            position: "Sorter",
            employment_status: "Probationary",
            date_hired: "2026-02-27",
            branch_location: "Cebu Hub",
            is_active: 1
        }
    ],
    users: [
        {
            name: "Super Admin",
            email: "admin@gmail.com",
            password_hash: "$2a$10$c6bFRVS19qcGNz3H58VKBu0GKxWULVcGd1tQ7AjHo/RTq2vJNo3KK",
            role: "SuperAdmin",
            employee_id: null
        },
        {
            name: "HR Admin",
            email: "hr@company.com",
            password_hash: "$2a$10$Tok/bylLLFvd2RLra2geFOXC663ogeOjjLhav757jKRNk.bAYOope",
            role: "HRAdmin",
            employee_id: null
        },
        {
            name: "Maria Santos",
            email: "maria@test.com",
            password_hash: "$2a$10$cYoSzN9ogJ9mDlTfx9336e7Gf4t/D6UUIzBwit.NvVxR2g4xQ/Q06",
            role: "Employee",
            employee_id: 3
        },
        {
            name: "Zick Admin",
            email: "zickadmin@gmail.com",
            password_hash: "$2a$10$E/DvzwkD7naVoxfTxHCtaOtXSB.4ePnFDV/joUhogkvxdn7X5zZZi",
            role: "SuperAdmin",
            employee_id: null
        }
    ]
};

module.exports = seedData;