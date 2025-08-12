const pool = require('../../config/db');

exports.getAllTeams = async (req, res) => {
    try {
        const search = (req.query.search || '').slice(0, 50); // Limit search to 50 characters
        const sql = `
            SELECT id, nama_club, logo_club 
            FROM teams 
            WHERE status_akun = "sudah_bayar"
            AND nama_club LIKE ?
        `;

        const [rows] = await pool.query(sql, [`%${search}%`]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No teams found' });
        }

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.DetailTeam = async (req, res) => {
  try {
    const { id_team } = req.params;
    const tahun = new Date().getFullYear();

    // Ambil detail tim
    const [teamResult] = await pool.query(`
      SELECT id, nama_club, logo_club,tahun_berdiri, manager,kontak,basecamp
      FROM teams
      WHERE id = ?
    `, [id_team]);

    if (teamResult.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Tim tidak ditemukan' });
    }

    const team = teamResult[0];

    // Ambil event yang diikuti tim
    const [events] = await pool.query(`
      SELECT DISTINCT e.id AS id_event, e.nama_event, e.tanggal_mulai, k.id AS id_kategori ,k.nama_kategori
      FROM pemain_event pe
      JOIN event_categories k ON k.id = pe.id_kategori
      JOIN events e ON e.id = k.id_event
      WHERE pe.id_team = ? AND YEAR(pe.created_at) = ?
    `, [id_team, tahun]);

    const idKategoriList = events.map(e => e.id_kategori);
    let pemainEvent = [];

    if (idKategoriList.length > 0) {
      const placeholders = idKategoriList.map(() => '?').join(',');
      const values = [id_team, ...idKategoriList];

      const [result] = await pool.query(`
        SELECT 
          pe.id_pemain, 
          pe.id_kategori, 
          pe.jumlah_gol, 
          p.nama_pemain,
          p.foto_pemain,
          p.posisi, 
          p.tempat_lahir, 
          p.tanggal_lahir, 
          p.gender,
          TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CURDATE()) AS usia_tahun,
          TIMESTAMPDIFF(MONTH, p.tanggal_lahir, CURDATE()) % 12 AS usia_bulan
        FROM pemain_event pe
        JOIN pemain p ON p.id = pe.id_pemain
        WHERE pe.id_team = ? AND pe.id_kategori IN (${placeholders})
      `, values);

      pemainEvent = result;
    }

    res.json({
      status: 'success',
      tahun,
      team,
      event_terdaftar: events,
      pemain_event: pemainEvent
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Gagal mengambil detail tim' });
  }
};
