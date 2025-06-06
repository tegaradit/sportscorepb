const pool = require('../../config/db');

// 🔍 Cari pemain berdasarkan nama (untuk ditambahkan ke pemain_event)
exports.searchPemain = async (req, res) => {
  const { id } = req.team; // dari token tim login
  const { keyword } = req.query;

  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.nama_pemain, p.tanggal_lahir, p.tempat_lahir, p.no_kk
      FROM pemain p
      WHERE p.id_team = ? AND p.nama_pemain LIKE ?
      LIMIT 10
    `, [id, `%${keyword}%`]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error searchPemain:', err.message);
    res.status(500).json({ message: 'Gagal mencari pemain' });
  }
};

// ➕ Tambahkan pemain ke event (pemain_event)
exports.tambahPemainEvent = async (req, res) => {
  const { id } = req.team; 
  const { id_pemain, id_kategori, no_punggung } = req.body;

  try {
    // Cek duplikat
    const [existing] = await pool.query(`
      SELECT * FROM pemain_event WHERE id_kategori = ? AND id_pemain = ?
    `, [id_kategori, id_pemain]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Pemain sudah terdaftar di event ini' });
    }

    await pool.query(`
      INSERT INTO pemain_event (id_kategori, id_pemain, id_team, no_punggung, status)
      VALUES (?, ?, ?, ?, 'aktif')
    `, [id_kategori, id_pemain, id, no_punggung]);

    res.status(201).json({ message: 'Pemain berhasil ditambahkan ke event' });
  } catch (err) {
    console.error('❌ Error tambahPemainEvent:', err.message);
    res.status(500).json({ message: 'Gagal menambahkan pemain ke event' });
  }
};
