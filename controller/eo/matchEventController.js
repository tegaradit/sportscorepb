const pool = require('../../config/db');

// Tambah event ke match
exports.addEvent = async (req, res) => {
  const { id_match } = req.params;
  const { id_pemain_event, tipe, menit } = req.body;

  try {
    // Validasi pemain ada di lineup
    const [cek] = await pool.query(`
      SELECT pe.id_team, m.id_team_1, m.id_team_2
      FROM match_lineup ml
      JOIN pemain_event pe ON ml.id_pemain_event = pe.id
      JOIN matches m ON ml.id_match = m.id
      WHERE ml.id_match = ? AND ml.id_pemain_event = ?
    `, [id_match, id_pemain_event]);

    if (cek.length === 0) {
      return res.status(400).json({ message: 'Pemain tidak ada di lineup pertandingan ini' });
    }

    const { id_team, id_team_1, id_team_2 } = cek[0];

    // Tambah event
    await pool.query(`
      INSERT INTO match_events (id_match, id_pemain_event, tipe, menit)
      VALUES (?, ?, ?, ?)
    `, [id_match, id_pemain_event, tipe, menit]);

    // Jika gol, update skor dan top skor
    if (tipe === 'gol') {
      // Update jumlah gol pemain
      await pool.query(`
        UPDATE pemain_event SET jumlah_gol = jumlah_gol + 1 WHERE id = ?
      `, [id_pemain_event]);

      // Update skor tim
      const kolomSkor = id_team === id_team_1 ? 'skor_tim_1' : 'skor_tim_2';
      await pool.query(`
        UPDATE matches SET ${kolomSkor} = ${kolomSkor} + 1 WHERE id = ?
      `, [id_match]);
    }

    res.status(201).json({ message: 'Event berhasil ditambahkan & skor diperbarui' });
  } catch (err) {
    console.error('❌ Error addEvent:', err.message);
    res.status(500).json({ message: 'Gagal menambahkan event' });
  }
};


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

