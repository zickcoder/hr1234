const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const seedData = require('../seedData');

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Find user in seedData
    const user = seedData.users.find(u => u.email === email);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Compare password with bcrypt hash
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
        {
            id: user.id || 0, // Fallback if ID is missing in seedData
            name: user.name,
            email: user.email,
            role: user.role,
            employee_id: user.employee_id
        },
        process.env.JWT_SECRET || 'your_fallback_secret', // Should be set in Vercel environment variables
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
            token,
            user: {
                id: user.id || 0,
                name: user.name,
                email: user.email,
                role: user.role,
                employee_id: user.employee_id
            }
        }
    });
}
