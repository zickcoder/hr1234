const bcrypt = require('bcryptjs');

const passwords = ['123456', 'Admin123!', '12345'];
passwords.forEach(pw => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pw, salt);
    console.log(`${pw}: ${hash}`);
});
