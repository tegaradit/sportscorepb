const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const logoDir = path.join(__dirname, '../uploads/logo-tim');
const logFile = path.join(__dirname, '../logs/tim-dihapus.log'); // simpan log di folder logs

// Pastikan folder logs ada
const logsDir = path.dirname(logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

async function hapusTimBelumBayarLebihDari2Minggu() {
  try {
    const [teams] = await pool.query(`
      SELECT id, nama_club, logo_club, created_at FROM teams
      WHERE status_akun = 'belum_bayar'
      AND created_at < NOW() - INTERVAL 14 DAY
    `);

    if (teams.length === 0) {
      console.log('🟢 Tidak ada tim yang perlu dihapus hari ini.');
      return;
    }

    for (const team of teams) {
      const logoPath = path.join(logoDir, team.logo_club);
      const timestamp = new Date().toISOString();

      // Coba hapus logo jika ada
      if (team.logo_club && fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }

      // Hapus dari DB
      await pool.query('DELETE FROM teams WHERE id = ?', [team.id]);

      // Catat ke log file
      const logData = `[${timestamp}] HAPUS TIM ID: ${team.id}, Nama: ${team.nama_club}, Logo: ${team.logo_club}, Dibuat: ${team.created_at}\n`;
      fs.appendFileSync(logFile, logData, 'utf8');

      console.log(`🗑️ Tim ${team.nama_club} (ID: ${team.id}) dihapus dan dicatat ke log.`);
    }
  } catch (error) {
    console.error('🔥 ERROR saat hapus tim:', error.message);
  }
}

module.exports = hapusTimBelumBayarLebihDari2Minggu;
