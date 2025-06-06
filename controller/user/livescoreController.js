const pool = require('../../config/db');
exports.getLiveScores = async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const [matchesGrup] = await pool.query(`
      SELECT 
        m.id AS match_id,
        m.id_kategori,
        m.*, 
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo
      FROM matches m
      JOIN teams t1 ON m.team_1 = t1.id
      JOIN teams t2 ON m.team_2 = t2.id
      WHERE m.waktu BETWEEN ? AND ?
      ORDER BY m.waktu
    `, [todayStart, todayEnd]);

    const [matchesBracket] = await pool.query(`
      SELECT 
        b.id AS bracket_id,
        b.match_id,
        b.id_kategori, -- tambahkan ini
        b.team_1, b.team_2,
        b.skor_1, b.skor_2,
        b.kode, b.waktu,
        b.status,
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo,
        t3.nama_club AS pemenang_name
      FROM brackets b
      LEFT JOIN teams t1 ON b.team_1 = t1.id
      LEFT JOIN teams t2 ON b.team_2 = t2.id
      LEFT JOIN teams t3 ON b.pemenang = t3.id
      WHERE b.waktu BETWEEN ? AND ?
      ORDER BY b.waktu
    `, [todayStart, todayEnd]);

    res.status(200).json({
      grup: matchesGrup,
      bracket: matchesBracket
    });

  } catch (error) {
    console.error("❌ Error getLiveScores:", error);
    res.status(500).json({ message: "Gagal mengambil live score" });
  }
};


exports.getMatchesByKategori = async (req, res) => {
  const id_kategori = req.query.id_kategori || req.query.kategori;
  const id_event = req.query.id_event || req.query.event;

  try {
    let kategoriIds = [];

    if (id_kategori) {
      kategoriIds = [id_kategori];
    } else if (id_event) {
      const [kategoriRows] = await pool.query(
        `SELECT id FROM event_categories WHERE id_event = ?`,
        [id_event]
      );
      kategoriIds = kategoriRows.map(k => k.id);
    } else {
      return res.status(400).json({ message: 'id_event atau id_kategori harus disertakan' });
    }

    if (kategoriIds.length === 0) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    // Ambil match grup
    const [matchGrup] = await pool.query(`
      SELECT 
        m.id AS match_id,
        m.*, 
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo
      FROM matches m
      JOIN teams t1 ON m.team_1 = t1.id
      JOIN teams t2 ON m.team_2 = t2.id
      WHERE m.id_kategori IN (?)
      ORDER BY m.waktu
    `, [kategoriIds]);

    // Ambil match bracket
    const [matchBracket] = await pool.query(`
      SELECT 
        b.id AS bracket_id,
        b.match_id,
        b.team_1, b.team_2,
        b.skor_1, b.skor_2,
        b.kode, b.waktu,
        b.status,
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo,
        t3.nama_club AS pemenang_name
      FROM brackets b
      LEFT JOIN teams t1 ON b.team_1 = t1.id
      LEFT JOIN teams t2 ON b.team_2 = t2.id
      LEFT JOIN teams t3 ON b.pemenang = t3.id
      WHERE b.id_kategori IN (?)
      ORDER BY b.waktu
    `, [kategoriIds]);

    res.status(200).json({
      grup: matchGrup,
      bracket: matchBracket
    });

  } catch (error) {
    console.error("❌ Error getMatchesByKategori:", error);
    res.status(500).json({ message: "Gagal mengambil data pertandingan" });
  }
};