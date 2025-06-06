const pool = require('../../config/db');

// ✅ Ambil semua kategori berdasarkan event
exports.getKategoriByEvent = async (req, res) => {
  const { id_event } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM event_categories WHERE id_event = ?',
      [id_event]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ getKategoriByEvent:', err.message);
    res.status(500).json({ message: 'Gagal ambil kategori event' });
  }
};

// ✅ Ambil detail kategori berdasarkan ID
exports.getKategoriById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM event_categories WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('❌ getKategoriById:', err.message);
    res.status(500).json({ message: 'Gagal ambil kategori' });
  }
};

// ✅ Buat kategori baru
exports.createKategori = async (req, res) => {
  const {
    id_event,
    nama_kategori,
    max_tim,
    gender,
    tipe_result,
    tipe_final,
    batas_usia
  } = req.body;

  if (!id_event || !nama_kategori || !tipe_result) {
    return res.status(400).json({
      message: 'Field wajib: id_event, nama_kategori, tipe_result'
    });
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO event_categories 
      (id_event, nama_kategori, max_tim, gender, tipe_result, tipe_final, batas_usia)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id_event,
        nama_kategori,
        max_tim || 16,
        gender || 'campuran',
        tipe_result,
        tipe_final || 'none',
        batas_usia || null
      ]
    );

    res.status(201).json({
      message: '✅ Kategori berhasil dibuat',
      id: result.insertId
    });
  } catch (err) {
    console.error('❌ createKategori:', err.message);
    res.status(500).json({ message: 'Gagal buat kategori' });
  }
};

// ✅ Update kategori
exports.updateKategori = async (req, res) => {
  const { id } = req.params;
  const {
    nama_kategori,
    max_tim,
    gender,
    tipe_result,
    tipe_final,
    batas_usia
  } = req.body;

  try {
    const [kategori] = await pool.query('SELECT * FROM event_categories WHERE id = ?', [id]);
    if (kategori.length === 0) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    await pool.query(
      `
      UPDATE event_categories SET
        nama_kategori = ?,
        max_tim = ?,
        gender = ?,
        tipe_result = ?,
        tipe_final = ?,
        batas_usia = ?
      WHERE id = ?
    `,
      [
        nama_kategori || kategori[0].nama_kategori,
        max_tim || kategori[0].max_tim,
        gender || kategori[0].gender,
        tipe_result || kategori[0].tipe_result,
        tipe_final || kategori[0].tipe_final,
        batas_usia ?? kategori[0].batas_usia,
        id
      ]
    );

    res.status(200).json({ message: '✅ Kategori berhasil diupdate' });
  } catch (err) {
    console.error('❌ updateKategori:', err.message);
    res.status(500).json({ message: 'Gagal update kategori' });
  }
};

// ✅ Hapus kategori
exports.deleteKategori = async (req, res) => {
  const { id } = req.params;
  try {
    const [cek] = await pool.query('SELECT * FROM event_categories WHERE id = ?', [id]);
    if (cek.length === 0) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    await pool.query('DELETE FROM event_categories WHERE id = ?', [id]);
    res.status(200).json({ message: '✅ Kategori berhasil dihapus' });
  } catch (err) {
    console.error('❌ deleteKategori:', err.message);
    res.status(500).json({ message: 'Gagal hapus kategori' });
  }
};

exports.inviteTeamToEvent = async (req, res) => {
  const { id_kategori, id_team, grup, search } = req.body || {};

  // Jika tidak ada id_team, anggap sebagai permintaan search team
  if (!id_team) {
    try {
      let query = `SELECT * FROM teams`;
      let params = [];

      if (search) {
        query += ` WHERE nama_club LIKE ?`;
        params.push(`%${search}%`);
      }

      const [teams] = await pool.query(query, params);
      return res.status(200).json(teams);
    } catch (err) {
      console.error('❌ Error search teams in inviteTeamToEvent:', err.message);
      return res.status(500).json({ message: 'Gagal mengambil data tim' });
    }
  }

  // Kalau ada id_team, berarti invite tim
  if (!id_kategori) {
    return res.status(400).json({ message: 'id_kategori wajib diisi' });
  }

  try {
    const [kategoriRows] = await pool.query(
      `SELECT tipe_result FROM event_categories WHERE id = ?`, [id_kategori]
    );
    if (kategoriRows.length === 0) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    const [rows] = await pool.query(
      `SELECT * FROM event_teams WHERE id_kategori = ? AND id_team = ?`,
      [id_kategori, id_team]
    );
    if (rows.length > 0) {
      return res.status(409).json({ message: 'Tim sudah diundang ke kategori ini' });
    }

    await pool.query(
      `INSERT INTO event_teams (id_kategori, id_team, status_pendaftaran, grup)
       VALUES (?, ?, 'terima', ?)`,
      [id_kategori, id_team, grup || null]
    );
    console.log(pool.query);
    return res.status(201).json({ message: 'Tim berhasil diundang dan diterima ke kategori' });

  } catch (error) {
    console.error('❌ Error inviteTeamToEvent:', error.message);
    res.status(500).json({ message: 'Gagal mengundang tim' });
  }
};



exports.updateGrubTeam = async (req, res) => {
  const { id_kategori, id_team, grup } = req.body;

  if (!id_kategori || !id_team || !grup) {
    return res.status(400).json({ message: 'id_kategori, id_team, dan grup wajib diisi' });
  }

  try {
    const [cek] = await pool.query(
      `SELECT * FROM event_teams WHERE id_kategori = ? AND id_team = ?`,
      [id_kategori, id_team]
    );

    if (cek.length === 0) {
      console.log(cek.length === 0);
      return res.status(404).json({ message: 'Tim tidak ditemukan dalam kategori ini' });
    }

    // Optional: validasi agar grup tidak sama (kalau diperlukan)
    if (cek[0].grup === grup) {
      return res.status(200).json({ message: 'Grup tim sudah sesuai, tidak ada perubahan' });
    }

    await pool.query(
      `UPDATE event_teams SET grup = ? WHERE id_kategori = ? AND id_team = ?`,
      [grup, id_kategori, id_team]
    );

    res.status(200).json({ message: 'Grup tim berhasil diperbarui' });
  } catch (err) {
    console.error('❌ Error updateGrubTeam:', err.message);
    res.status(500).json({ message: 'Gagal memperbarui grup tim' });
  }
};


exports.getTeamsByGrub = async (req, res) => {
  const { id_kategori, grup } = req.query;

  if (!id_kategori || !grup) {
    return res.status(400).json({ message: 'id_kategori dan grup wajib diisi' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT et.id_team, t.nama_club, et.status_pendaftaran, et.grup
       FROM event_teams et
       JOIN teams t ON et.id_team = t.id
       WHERE et.id_kategori = ? AND et.grup = ?`,
      [id_kategori, grup]
    );

    res.status(200).json({ data: rows });
  } catch (err) {
    console.error('❌ Error getTeamsByGrub:', err.message);
    res.status(500).json({ message: 'Gagal mengambil tim berdasarkan grup' });
  }
};

exports.getAllGrubWithTeams = async (req, res) => {
  const { id_kategori } = req.query;

  if (!id_kategori) {
    return res.status(400).json({ message: 'id_kategori wajib diisi' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT et.grup, t.nama_club, et.id_team
      FROM event_teams et
      JOIN teams t ON et.id_team = t.id
      WHERE et.id_kategori = ? AND et.grup IS NOT NULL
      ORDER BY et.grup, t.nama_club
    `, [id_kategori]);

    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.grup]) grouped[row.grup] = [];
      grouped[row.grup].push({
        id_team: row.id_team,
        nama_club: row.nama_club
      });
    }

    res.status(200).json(grouped);
  } catch (error) {
    console.error('❌ Error getAllGrubWithTeams:', error.message);
    res.status(500).json({ message: 'Gagal mengambil data grup' });
  }
};

exports.deleteTeamFromKategori = async (req, res) => {
  const { id_kategori, id_team } = req.body;

  if (!id_kategori || !id_team) {
    return res.status(400).json({ message: 'id_kategori dan id_team wajib diisi' });
  }

  try {
    const [cek] = await pool.query(
      `SELECT * FROM event_teams WHERE id_kategori = ? AND id_team = ?`,
      [id_kategori, id_team]
    );

    if (cek.length === 0) {
      return res.status(404).json({ message: 'Tim tidak ditemukan dalam kategori ini' });
    }

    await pool.query(
      `DELETE FROM event_teams WHERE id_kategori = ? AND id_team = ?`,
      [id_kategori, id_team]
    );

    res.status(200).json({ message: 'Tim berhasil dihapus dari kategori' });
  } catch (error) {
    console.error('❌ Error deleteTeamFromKategori:', error.message);
    res.status(500).json({ message: 'Gagal menghapus tim dari kategori' });
  }
};
exports.getKategoriWithGrupByEvent = async (req, res) => {
  const { id_event } = req.params;

  if (!id_event) {
    return res.status(400).json({ message: 'id_event wajib diisi' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        ec.id, ec.nama_kategori, ec.max_tim, ec.gender, ec.tipe_result, ec.tipe_final, ec.batas_usia,
        COUNT(et.id_team) as jumlah_tim
      FROM event_categories ec
      LEFT JOIN event_teams et ON ec.id = et.id_kategori
      WHERE ec.id_event = ?
      GROUP BY ec.id
      ORDER BY ec.nama_kategori ASC
    `, [id_event]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error getKategoriWithGrupByEvent:', err.message);
    res.status(500).json({ message: 'Gagal mengambil kategori dari event' });
  }
};

exports.getPesertaByKategori = async (req, res) => {
  const { id_kategori } = req.params;

  if (!id_kategori) {
    return res.status(400).json({ message: 'id_kategori wajib diisi' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        et.id_team,
        t.nama_club,
        t.logo_club,
        et.status_pendaftaran,
        et.grup
      FROM event_teams et
      JOIN teams t ON et.id_team = t.id
      WHERE et.id_kategori = ?
      ORDER BY t.nama_club ASC
    `, [id_kategori]);

    res.status(200).json({ peserta: rows });
  } catch (error) {
    console.error('❌ Error getPesertaByKategori:', error.message);
    res.status(500).json({ message: 'Gagal mengambil data peserta' });
  }
};

exports.getFullInfoByKategori = async (req, res) => {
  const { id } = req.params; // id kategori

  try {
    // 1. Ambil data kategori
    const [[kategori]] = await pool.query(`SELECT * FROM event_categories WHERE id = ?`, [id]);
    if (!kategori) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    // 2. Ambil data event
    const [[event]] = await pool.query(`SELECT * FROM events WHERE id = ?`, [kategori.id_event]);

    // 3. View klasemen berdasarkan model
    const viewName = kategori.model_klasemen === 'head_to_head'
      ? 'klasemen_headtohead_view'
      : 'klasemen_default_view';

    const [klasemenRaw] = await pool.query(`
      SELECT k.*, t.nama_club AS team_name, t.logo_club AS team_logo
      FROM ${viewName} k
      JOIN teams t ON t.id = k.id_team
      WHERE k.id_kategori = ?
      ORDER BY k.grup, k.ranking
    `, [id]);

    // Kelompokkan klasemen per grup + tambahkan logo & 5 pertandingan terakhir
    const klasemen = {};
    for (const k of klasemenRaw) {
      if (!klasemen[k.grup]) klasemen[k.grup] = [];

      // Ambil 5 pertandingan terakhir
      const [last5Matches] = await pool.query(`
        SELECT 
          m.team_1, m.team_2, m.skor_1, m.skor_2
        FROM matches m
        WHERE m.status = 'selesai' 
          AND m.id_kategori = ?
          AND (m.team_1 = ? OR m.team_2 = ?)
        ORDER BY m.waktu DESC
        LIMIT 5
      `, [id, k.id_team, k.id_team]);

      const formTerakhir = [];
      for (const m of last5Matches) {
        const isHome = m.team_1 === k.id_team;
        const skorKita = isHome ? m.skor_1 : m.skor_2;
        const skorLawan = isHome ? m.skor_2 : m.skor_1;

        if (skorKita > skorLawan) formTerakhir.push("menang");
        else if (skorKita < skorLawan) formTerakhir.push("kalah");
        else formTerakhir.push("seri");
      }

      klasemen[k.grup].push({
        id_team: k.id_team,
        team_name: k.team_name,
        team_logo: k.team_logo,
        ma: k.main,
        me: k.menang,
        s: k.seri,
        k: k.kalah,
        gm: k.goal_masuk,
        gk: k.goal_kebobolan,
        selisih: k.selisih,
        poin: k.point,
        kuning: k.kartu_kuning,
        merah: k.kartu_merah,
        ranking: k.ranking,
        form: formTerakhir
      });
    }

    // 4. Pertandingan
    const [matchRows] = await pool.query(`
      SELECT m.*, 
             t1.nama_club AS team1_name, 
             t2.nama_club AS team2_name,
             t1.logo_club AS team1_logo,
             t2.logo_club AS team2_logo
      FROM matches m
      JOIN teams t1 ON m.team_1 = t1.id
      JOIN teams t2 ON m.team_2 = t2.id
      WHERE m.id_kategori = ? AND DATE(m.waktu) >= CURDATE()
      ORDER BY m.waktu ASC
    `, [id]);

    const pertandingan = matchRows.map(m => ({
      id: m.id,
      waktu: m.waktu,
      status: m.status,
      home_team: m.team1_name,
      away_team: m.team2_name,
      home_team_logo: m.team1_logo,
      away_team_logo: m.team2_logo,
      score_home: m.skor_1,
      score_away: m.skor_2
    }));

    // 5. Bracket
    const [bracketRows] = await pool.query(`
      SELECT b.*, t1.nama_club AS team1_name, t2.nama_club AS team2_name, t3.nama_club AS pemenang_name
      FROM brackets b
      LEFT JOIN teams t1 ON b.team_1 = t1.id
      LEFT JOIN teams t2 ON b.team_2 = t2.id
      LEFT JOIN teams t3 ON b.pemenang = t3.id
      WHERE b.id_kategori = ?
      ORDER BY FIELD(b.babak, 'semifinal', 'juara_3', 'final'), b.kode
    `, [id]);

    const bracket = bracketRows.map(b => ({
      kode: b.kode,
      babak: b.babak,
      team_1: b.team1_name,
      team_2: b.team2_name,
      skor_1: b.skor_1,
      skor_2: b.skor_2,
      pemenang: b.pemenang_name
    }));

    // 6. Top Skor
    const [topRows] = await pool.query(`
      SELECT p.nama_pemain, p.foto_pemain, t.nama_club AS team_name, pe.jumlah_gol
      FROM pemain_event pe
      JOIN pemain p ON pe.id_pemain = p.id
      JOIN teams t ON pe.id_team = t.id
      WHERE pe.id_kategori = ?
      ORDER BY pe.jumlah_gol DESC
      LIMIT 5
    `, [id]);

    const topScorer = topRows.length ? {
      name: topRows[0].nama_pemain,
      goals: topRows[0].jumlah_gol,
      photo: topRows[0].foto_pemain
    } : null;

    // Hasil akhir
    const result = {
      event,
      kategori,
      pertandingan,
      klasemen,
      bracket,
      top_skor: {
        top: topScorer,
        list: topRows.map(r => ({
          name: r.nama_pemain,
          photo: r.foto_pemain,
          team: r.team_name,
          goals: r.jumlah_gol
        }))
      }
    };

    // ✅ Kirim hasil ke client HTTP
    res.status(200).json(result);

    // 🔴 Emit ke client WebSocket yg subscribe kategori ini
    const io = req.app.get('io');
    if (io) {
      io.to(`kategori_${id}`).emit(`kategori:${id}:info`, result);
    }

  } catch (error) {
    console.error('❌ Error getFullInfoByKategori:', error.message);
    res.status(500).json({ message: 'Gagal mengambil info lengkap berdasarkan kategori' });
  }
};


exports.getAllTeamWithSearch = async (req, res) => {
  const { search } = req.query;

  try {
    let query = `SELECT * FROM teams`;
    let params = [];

    if (search) {
      query += ` WHERE nama_club LIKE ?`;
      params.push(`%${search}%`);
    }

    const [teams] = await pool.query(query, params);
    res.status(200).json(teams);
  } catch (error) {
    console.error('❌ Error getAllTeamWithSearch:', error.message);
    res.status(500).json({ message: 'Gagal mengambil data tim' });
  }
};