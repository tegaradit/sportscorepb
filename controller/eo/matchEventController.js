const pool = require('../../config/db');



// Ambil semua event untuk 1 match
exports.getEvents = async (req, res) => {
  const { id_match } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT me.id, me.tipe, me.menit,
             ml.no_punggung, p.nama_pemain, p.foto,
             t.m
      FROM match_events me
      JOIN pemain_event pe ON me.id_pemain_event = pe.id
      JOIN pemain p ON pe.id_pemain = p.id
      JOIN teams t ON pe.id_team = t.id
      JOIN match_lineup ml ON ml.id_pemain_event = pe.id AND ml.id_match = me.id_match
      WHERE me.id_match = ?
      ORDER BY me.menit ASC
    `, [id_match]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error getEvents:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data event' });
  }
};

