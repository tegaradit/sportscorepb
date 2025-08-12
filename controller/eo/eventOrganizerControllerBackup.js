const pool = require('../../config/db');
const jwt = require('jsonwebtoken');
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

exports.loginEo = async (req, res) =>{
    const {email, password} = req.body
if (!email || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  try {
    const query = 'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?';
    const [results] = await pool.query(query, [email, password, 'event_organizer']);

    if (results.length === 0) {
      return res.status(401).json({ message: 'email atau password salah atau bukan eo' });
    }

    const eo = results[0];
    const token = jwt.sign(
      { id: eo.id, email: eo.email, role: eo.role , name: eo.nama},
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    res
  .cookie('eo_token', token, {
    httpOnly: true,
    secure: true, // ganti ke true kalau pakai HTTPS
    sameSite: 'none', // atau 'none' kalau beda domain + HTTPS
    maxAge: 24 * 60 * 60 * 1000 //24 jam
  })
  .status(200)
  .json({
    message: 'Login eo berhasil',
    eo: {
      id: eo.id,
      email: eo.email,
      role: eo.role,
      name: eo.nama,
      token
    }
  });

  } catch (err) {
    console.error('Login eo error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

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


