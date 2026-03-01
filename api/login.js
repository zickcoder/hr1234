const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const seedData = require('./seedData');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    try {
        // Find user by email (case-insensitive)
        const user = seedData.users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            console.log('User not found');
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        console.log('Found user:', user.name);
        console.log('Stored hash:', user.password); // In production, don't log this

        // Compare password with hash
        // Note: For seedData, we might use plain text if hashes aren't generated yet, 
        // but the prompt specified bcryptjs so we use it here.
        // We'll handle both plain text and bcrypt for robust seeding.
        let isMatch = false;
        if (user.password.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            console.log('Password mismatch');
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        console.log('Login successful');
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error during login' });
    }
}
