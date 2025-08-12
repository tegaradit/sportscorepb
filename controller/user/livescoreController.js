const pool = require('../../config/db');

exports.getLiveScores = async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const sportCategory = req.query.kategori; // Mengambil parameter kategori dari query

    let queryMatchesGrup = `
      SELECT 
        m.id AS match_id,
        m.id_kategori,
        m.*, 
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo,
        ec.nama_kategori,  -- TAMBAHKAN INI
        e.nama_event       -- TAMBAHKAN INI
      FROM matches m
      JOIN teams t1 ON m.team_1 = t1.id
      JOIN teams t2 ON m.team_2 = t2.id
      JOIN event_categories ec ON m.id_kategori = ec.id
      JOIN events e ON ec.id_event = e.id
      WHERE m.waktu BETWEEN ? AND ?
    `;

    let queryMatchesBracket = `
      SELECT 
        b.id AS bracket_id,
        b.match_id,
        b.id_kategori,
        b.team_1, b.team_2,
        b.skor_1, b.skor_2,
        b.kode, b.waktu,
        b.status,
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo,
        t3.nama_club AS pemenang_name,
        ec.nama_kategori,   -- TAMBAHKAN INI
        e.nama_event        -- TAMBAHKAN INI
      FROM brackets b
      LEFT JOIN teams t1 ON b.team_1 = t1.id
      LEFT JOIN teams t2 ON b.team_2 = t2.id
      LEFT JOIN teams t3 ON b.pemenang = t3.id
      JOIN event_categories ec ON b.id_kategori = ec.id
      JOIN events e ON ec.id_event = e.id
      WHERE b.waktu BETWEEN ? AND ?
    `;

    const queryParams = [todayStart, todayEnd];

    if (sportCategory) {
      queryMatchesGrup += ` AND e.kategory_olahraga = ?`;
      queryMatchesBracket += ` AND e.kategory_olahraga = ?`;
      queryParams.push(sportCategory);
    }

    queryMatchesGrup += ` ORDER BY m.waktu`;
    queryMatchesBracket += ` ORDER BY b.waktu`;

    const [matchesGrup] = await pool.query(queryMatchesGrup, queryParams);
    const [matchesBracket] = await pool.query(queryMatchesBracket, queryParams);

    res.status(200).json({
      grup: matchesGrup,
      bracket: matchesBracket
    });

  } catch (error) {
    console.error("❌ Error getLiveScores:", error);
    res.status(500).json({ message: "Gagal mengambil live score" });
  }
};
