const pool = require('../config/db');

async function getDurasiDanJumlahBabakByMatchId(matchId) {
  const [rows] = await pool.query(`
    SELECT 
      m.durasi_babak AS match_durasi,
      m.jumlah_babak AS match_jumlah,
      k.durasi_babak AS kategori_durasi,
      k.jumlah_babak AS kategori_jumlah
    FROM matches m
    JOIN event_categories k ON m.id_kategori = k.id
    WHERE m.id = ?
  `, [matchId]);

  if (rows.length === 0) return null;

  const row = rows[0];

  return {
    durasi_babak: row.match_durasi ?? row.kategori_durasi,
    jumlah_babak: row.match_jumlah ?? row.kategori_jumlah
  };
}

module.exports = {
  getDurasiDanJumlahBabakByMatchId
};
