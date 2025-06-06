const pool = require('../../config/db');

// ✅ GET - Tampilkan lineup per pertandingan
exports.getLineup = async (req, res) => {
  const { id_match } = req.params;
  const id_team = req.team?.id;

  try {
    if (!id_team) {
      return res.status(401).json({ message: 'Tim tidak terautentikasi' });
    }

    const [rows] = await pool.query(`
      SELECT ml.id, ml.is_starting, pe.id AS id_pemain_event, ml.no_punggung, p.nama_pemain, p.foto_pemain
      FROM match_lineup ml
      JOIN pemain_event pe ON ml.id_pemain_event = pe.id
      JOIN pemain p ON pe.id_pemain = p.id
      WHERE ml.id_match = ? AND pe.id_team = ?
    `, [id_match, id_team]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error getLineup:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data lineup' });
  }
};

exports.getStaffLineup = async (req, res) => {
  const { id_match } = req.params;
  const id_team = req.team?.id;

  try {
    if (!id_team) {
      return res.status(401).json({ message: 'Tim tidak terautentikasi' });
    }

    const [rows] = await pool.query(`
      SELECT 
        msl.id, 
        se.id AS id_staff_event, 
        s.nama_staff, 
        s.foto, 
        msl.jabatan
      FROM match_staff_lineup msl
      JOIN staff_event se ON msl.id_staff_event = se.id
      JOIN staff s ON se.id_staff = s.id
      WHERE msl.id_match = ? AND se.id_team = ?
    `, [id_match, id_team]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error getStaffLineup:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data staff lineup' });
  }
};


exports.getStaffLineupAll = async (req, res) => {
  const { id_match } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT 
        msl.id, 
        se.id AS id_staff_event, 
        s.nama_staff, 
        s.foto, 
        msl.jabatan,
        se.id_team
      FROM match_staff_lineup msl
      JOIN staff_event se ON msl.id_staff_event = se.id
      JOIN staff s ON se.id_staff = s.id
      WHERE msl.id_match = ?
    `, [id_match]);

    const lineup = {
      team_1: [],
      team_2: []
    };

    const [teams] = await pool.query(`
      SELECT team_1, team_2 FROM matches WHERE id = ?
    `, [id_match]);

    if (teams.length === 0) {
      return res.status(404).json({ message: 'Pertandingan tidak ditemukan' });
    }

    const { team_1, team_2 } = teams[0];

    for (const row of rows) {
      const staff = {
        id: row.id,
        id_staff_event: row.id_staff_event,
        nama: row.nama_staff,
        jabatan: row.jabatan,
        foto: row.foto
      };

      if (row.id_team === team_1) lineup.team_1.push(staff);
      else if (row.id_team === team_2) lineup.team_2.push(staff);
    }

    res.status(200).json(lineup);
  } catch (err) {
    console.error('❌ Error getStaffLineupAll:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data staff lineup' });
  }
};




// ✅ GET - Tampilkan lineup per pertandingan, dikelompokkan per tim
exports.getLineupAll = async (req, res) => {
  const { id_match } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT 
        ml.id, 
        ml.is_starting, 
        pe.id AS id_pemain_event, 
        ml.no_punggung, 
        p.nama_pemain, 
        p.foto_pemain,
        pe.id_team
      FROM match_lineup ml
      JOIN pemain_event pe ON ml.id_pemain_event = pe.id
      JOIN pemain p ON pe.id_pemain = p.id
      WHERE ml.id_match = ?
    `, [id_match]);

    const lineup = {
      team_1: [],
      team_2: []
    };

    // Ambil id team 1 & 2 dari match (bisa juga disediakan via frontend)
    const [teams] = await pool.query(`
      SELECT team_1, team_2 FROM matches WHERE id = ?
    `, [id_match]);

    if (teams.length === 0) {
      return res.status(404).json({ message: 'Pertandingan tidak ditemukan' });
    }

    const { team_1, team_2 } = teams[0];

    for (const row of rows) {
      const pemain = {
        id: row.id,
        id_pemain_event: row.id_pemain_event,
        nama: row.nama_pemain,
        no_punggung: row.no_punggung,
        foto: row.foto_pemain,
        starting: !!row.is_starting
      };

      if (row.id_team === team_1) lineup.team_1.push(pemain);
      else if (row.id_team === team_2) lineup.team_2.push(pemain);
    }

    res.status(200).json(lineup);
  } catch (err) {
    console.error('❌ Error getLineup:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data lineup' });
  }
};




// ✅ POST - Tambah pemain ke lineup
exports.addToLineup = async (req, res) => {
  const { id_match } = req.params;
  const { id_pemain_event, no_punggung, is_starting } = req.body;
  console.log(id_pemain_event);

  try {
    // Cek apakah id_pemain_event valid
    const [cekPemainEvent] = await pool.query(
      'SELECT id, id_team FROM pemain_event WHERE id = ?',
      [id_pemain_event]
    );

    if (cekPemainEvent.length === 0) {
      return res.status(400).json({ message: 'Pemain tidak terdaftar di event (id_pemain_event tidak ditemukan)' });
    }

    const id_team = cekPemainEvent[0].id_team;

    // Hitung jumlah pemain lineup dari tim yang sama di match ini
    const [jumlahLineup] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM match_lineup ml
      JOIN pemain_event pe ON ml.id_pemain_event = pe.id
      WHERE ml.id_match = ? AND pe.id_team = ?
    `, [id_match, id_team]);

    if (jumlahLineup[0].total >= 14) {
      return res.status(400).json({ message: 'Maksimal 14 pemain per tim dalam 1 pertandingan' });
    }

    // Insert ke match_lineup
    await pool.query(`
      INSERT INTO match_lineup (id_match, id_pemain_event, no_punggung, is_starting)
      VALUES (?, ?, ?, ?)
    `, [id_match, id_pemain_event, no_punggung, is_starting ? 1 : 0]);

    res.status(201).json({ message: 'Pemain ditambahkan ke line-up' });
  } catch (err) {
    console.error('❌ Error addToLineup:', err.message);
    res.status(500).json({ message: 'Gagal menambahkan ke lineup' });
  }
};

exports.addStaffToLineup = async (req, res) => {
  const { id_match } = req.params;
  const { id_staff_event, jabatan } = req.body;

  try {
    // Cek apakah staff valid dan ambil tim-nya
    const [cekStaffEvent] = await pool.query(
      'SELECT id, id_team FROM staff_event WHERE id = ?',
      [id_staff_event]
    );

    if (cekStaffEvent.length === 0) {
      return res.status(400).json({ message: 'Staff tidak terdaftar di event (id_staff_event tidak ditemukan)' });
    }

    const id_team = cekStaffEvent[0].id_team;

    // Cek apakah sudah melebihi batas staff lineup
    const [jumlahLineup] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM match_staff_lineup msl
      JOIN staff_event se ON msl.id_staff_event = se.id
      WHERE msl.id_match = ? AND se.id_team = ?
    `, [id_match, id_team]);

    if (jumlahLineup[0].total >= 4) {
      return res.status(400).json({ message: 'Maksimal 4 staff per tim dalam 1 pertandingan' });
    }

    // Masukkan ke match_staff_lineup
    await pool.query(`
      INSERT INTO match_staff_lineup (id_match, id_staff_event, jabatan)
      VALUES (?, ?, ?)
    `, [id_match, id_staff_event, jabatan]);

    res.status(201).json({ message: 'Staff ditambahkan ke line-up' });
  } catch (err) {
    console.error('❌ Error addStaffToLineup:', err.message);
    res.status(500).json({ message: 'Gagal menambahkan staff ke lineup' });
  }
};



// ❌ DELETE - Hapus pemain dari lineup
exports.removeFromLineup = async (req, res) => {
  const { id_match, id_pemain_event } = req.params;

  try {
    await pool.query(`
      DELETE FROM match_lineup
      WHERE id_match = ? AND id_pemain_event = ?
    `, [id_match, id_pemain_event]);

    res.status(200).json({ message: 'Pemain dihapus dari lineup' });
  } catch (err) {
    console.error('❌ Error removeFromLineup:', err.message);
    res.status(500).json({ message: 'Gagal menghapus pemain dari lineup' });
  }
};

// ✅ GET - Ambil nama dan nomor punggung pemain dalam lineup tim tertentu
exports.getLineupDropdown = async (req, res) => {
  const { id_match, id_team } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id AS id_pemain,
        p.nama_pemain, 
        ml.no_punggung 
      FROM match_lineup ml
      JOIN pemain_event pe ON ml.id_pemain_event = pe.id
      JOIN pemain p ON pe.id_pemain = p.id
      WHERE ml.id_match = ? AND pe.id_team = ?
    `, [id_match, id_team]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error getLineupDropdown:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data lineup dropdown' });
  }
};

exports.removeStaffFromLineup = async (req, res) => {
  const { id_match, id_staff_event } = req.params;

  try {
    await pool.query(`
      DELETE FROM match_staff_lineup
      WHERE id_match = ? AND id_staff_event = ?
    `, [id_match, id_staff_event]);

    res.status(200).json({ message: 'Staff dihapus dari lineup' });
  } catch (err) {
    console.error('❌ Error removeStaffFromLineup:', err.message);
    res.status(500).json({ message: 'Gagal menghapus staff dari lineup' });
  }
};

exports.getStaffLineupDropdown = async (req, res) => {
  const { id_match, id_team } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id AS id_staff,
        s.nama_staff, 
        msl.jabatan
      FROM match_staff_lineup msl
      JOIN staff_event se ON msl.id_staff_event = se.id
      JOIN staff s ON se.id_staff = s.id
      WHERE msl.id_match = ? AND se.id_team = ?
    `, [id_match, id_team]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error getStaffLineupDropdown:', err.message);
    res.status(500).json({ message: 'Gagal mengambil data staff lineup dropdown' });
  }
};
