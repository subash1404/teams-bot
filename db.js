const mysql = require('mysql2/promise');

// MySQL Database Configuration
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Replace with your MySQL username
    password: 'root',  // Replace with your MySQL password
    database: 'ticket'
});

async function connectDB() {
    try {
        await pool.getConnection();
        console.log('✅ Database connected successfully!');
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1); // Exit on failure
    }
}

module.exports = { pool, connectDB };
