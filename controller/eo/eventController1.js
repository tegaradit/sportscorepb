const pool = require('../../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const eventLogoDir = path.join(__dirname, '../uploads/logo-event');
if (!fs.existsSync(eventLogoDir)) {
  fs.mkdirSync(eventLogoDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, eventLogoDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'logo-' + unique + ext);
  }
});
const uploadEventLogo = multer({ storage });
exports.uploadEventLogo = uploadEventLogo;


//createEvent
exports.createEvent = async (req, res) => {
  const { nama_event, penyelenggara, lokasi, tanggal_mulai, tanggal_selesai, status, kategory } = req.body;
  const logo_event = req.file ? req.file.filename : null;

  if (!nama_event || !tanggal_mulai || !tanggal_selesai) {
    return res.status(400).json({ message: 'Nama event dan tanggal wajib diisi' });
  }

  try {
    // Convert tanggal ke format MySQL
    const mulai = new Date(tanggal_mulai);
    const selesai = new Date(tanggal_selesai);
    const formatMySQL = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await pool.query(`
      INSERT INTO events (nama_event, penyelenggara, lokasi, tanggal_mulai, tanggal_selesai, status, logo_event, kategory_olahraga)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nama_event,
      penyelenggara,
      lokasi,
      formatMySQL(mulai),
      formatMySQL(selesai),
      status || 'draft',
      logo_event,
      kategory
    ]);

    res.status(201).json({
      message: 'Event berhasil dibuat',
      data: { id: result.insertId, nama_event, logo_event }
    });
  } catch (error) {
    console.error('❌ Error createEvent:', error.message);
    res.status(500).json({ message: 'Gagal membuat event' });
  }
};
// 📌 GET all events
exports.getAllEvents = async (req, res) => {
  const { search, kategori, bulan } = req.query;

  let query = `SELECT * FROM events`;
  const conditions = [];
  const params = [];

  // 🔍 Filter by search
  if (search) {
    conditions.push(`nama_event LIKE ?`);
    params.push(`%${search}%`);
  }

  // 🏷️ Filter by kategori (dari tabel relasi event_categories)
  if (kategori) {
    conditions.push(`id IN (
      SELECT id_event FROM event_categories WHERE nama_kategori LIKE ?
    )`);
    params.push(`%${kategori}%`);
  }

  // 📅 Filter by bulan
  if (bulan) {
    const bulanMap = {
      Januari: 1, Februari: 2, Maret: 3, April: 4, Mei: 5, Juni: 6,
      Juli: 7, Agustus: 8, September: 9, Oktober: 10, November: 11, Desember: 12
    };
    const bulanAngka = bulanMap[bulan];
    if (bulanAngka) {
      conditions.push(`MONTH(tanggal_mulai) = ?`);
      params.push(bulanAngka);
    }
  }

  // ⛓️ Satukan semua kondisi
  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY created_at DESC`;

  try {
    const [rows] = await pool.query(query, params);
    res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('❌ Error getAllEvents:', error.message);
    res.status(500).json({ message: 'Gagal mengambil data event' });
  }
};
//get event by ID
exports.getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('❌ Error getEventById:', error.message);
    res.status(500).json({ message: 'Gagal mengambil data event' });
  }
};
// 📌 UPDATE event
exports.updateEvent = async (req, res) => {
    const { id } = req.params;
    const { nama_event, penyelenggara, lokasi, tanggal_mulai, tanggal_selesai, status } = req.body;
    const newLogo = req.file ? req.file.filename : null;
  
    try {
      const [existing] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Event tidak ditemukan' });
      }
  
      const current = existing[0];
  
      // Hapus logo lama jika ada dan user upload yang baru
      if (newLogo && current.logo_event) {
        const logoPath = path.join(__dirname, '../uploads/logo-event', current.logo_event);
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      }
  
      // Update ke DB
      await pool.query(`
        UPDATE events SET
          nama_event = ?,
          penyelenggara = ?,
          lokasi = ?,
          tanggal_mulai = ?,
          tanggal_selesai = ?,
          status = ?,
          logo_event = ?
        WHERE id = ?
      `, [
        nama_event || current.nama_event,
        penyelenggara || current.penyelenggara,
        lokasi || current.lokasi,
        tanggal_mulai || current.tanggal_mulai,
        tanggal_selesai || current.tanggal_selesai,
        status || current.status,
        newLogo || current.logo_event,
        id
      ]);
  
      res.status(200).json({ message: 'Event berhasil diperbarui' });
    } catch (error) {
      console.error('❌ Error updateEvent:', error.message);
      res.status(500).json({ message: 'Gagal memperbarui event' });
    }
  }; 
// 📌 DELETE event
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    await pool.query('DELETE FROM events WHERE id = ?', [id]);
    res.status(200).json({ message: 'Event berhasil dihapus' });
  } catch (error) {
    console.error('❌ Error deleteEvent:', error.message);
    res.status(500).json({ message: 'Gagal menghapus event' });
  }
};
// get all sport categories
exports.getAllKategoriOlahraga = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT kategory_olahraga AS nama_kategori
      FROM events
      WHERE kategory_olahraga IS NOT NULL AND kategory_olahraga != ''
    `);

    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error getAllKategoriOlahraga:', error.message);
    res.status(500).json({ message: 'Gagal mengambil daftar kategori olahraga' });
  }
};
//get full info event
exports.getFullEventInfo = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Event
    const [eventRows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (eventRows.length === 0) return res.status(404).json({ message: 'Event tidak ditemukan' });
    const event = eventRows[0];

    // 2. Kategori (ambil satu untuk sekarang)
    const [kategoriRows] = await pool.query('SELECT * FROM event_categories WHERE id_event = ? LIMIT 1', [id]);
    const kategori = kategoriRows[0] || null;
    if (!kategori) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    // 3. View klasemen berdasarkan model
    const viewName = kategori.model_klasemen === 'head_to_head'
      ? 'klasemen_headtohead_view'
      : 'klasemen_default_view';

    const [klasemenRaw] = await pool.query(`
      SELECT k.*, t.nama_club AS team_name
      FROM ${viewName} k
      JOIN teams t ON t.id = k.id_team
      WHERE k.id_kategori = ?
      ORDER BY k.grup, k.ranking
    `, [kategori.id]);

    // Kelompokkan klasemen per grup
    const klasemen = {};
    for (const k of klasemenRaw) {
      if (!klasemen[k.grup]) klasemen[k.grup] = [];
      klasemen[k.grup].push({
        team_name: k.team_name,
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
        ranking: k.ranking
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
      WHERE m.id_kategori = ?
      ORDER BY m.waktu ASC
    `, [kategori.id]);

    const pertandingan = matchRows.map(m => ({
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
`, [kategori.id]);

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
    `, [kategori.id]);

    const topScorer = topRows.length ? {
      name: topRows[0].nama_pemain,
      goals: topRows[0].jumlah_gol,
      photo: topRows[0].foto_pemain
    } : null;

    res.status(200).json({
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
    });

  } catch (error) {
    console.error('❌ Error getFullEventInfo:', error.message);
    res.status(500).json({ message: 'Gagal mengambil info lengkap event' });
  }
};
//search event by sport category
exports.searchEventByOlahraga = async (req, res) => {
  const { kategori } = req.query;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM events WHERE kategory_olahraga LIKE ? ORDER BY created_at DESC`,
      [`%${kategori}%`]
    );
    res.status(200).json({ total: rows.length, data: rows });
  } catch (err) {
    console.error('❌ Error searchEventByOlahraga:', err.message);
    res.status(500).json({ message: 'Gagal mencari event' });
  }
};