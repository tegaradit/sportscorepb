require('dotenv').config();
const mysql = require('mysql2');

// Membuat koneksi pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, 
  connectionLimit: 500,       
  queueLimit: 0              
});
async function checkConnection() {
  try {
    const connection = await pool.promise().getConnection();
    console.log('Koneksi ke database berhasil!');
    connection.release(); 
  } catch (err) {
    console.error('Koneksi gagal:', err);
  }
}
checkConnection();

module.exports = pool.promise();
