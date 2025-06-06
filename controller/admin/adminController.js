const pool = require('../../config/db');
const jwt = require('jsonwebtoken');

exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  try {
    const query = 'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?';
    const [results] = await pool.query(query, [email, password, 'admin']);

    if (results.length === 0) {
      return res.status(401).json({ message: 'email atau password salah atau bukan admin' });
    }

    const admin = results[0];
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role , name: admin.nama},
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    res
  .cookie('admin_token', token, {
    httpOnly: true,
    secure: true, // ganti ke true kalau pakai HTTPS
    sameSite: 'none', // atau 'none' kalau beda domain + HTTPS
    maxAge: 3 * 60 * 60 * 1000 // 3 jam
  })
  .status(200)
  .json({
    message: 'Login admin berhasil',
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.nama,
      token
    }
  });

  } catch (err) {
    console.error('Login admin error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

exports.createEo = async (req, res) => {
  const { email, password, nama } = req.body;

  if (!email || !password || !nama) {
    return res.status(400).json({ message: 'Email, password, dan nama EO wajib diisi' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email sudah digunakan' });
    }

    const query = 'INSERT INTO users (email, password, role, nama) VALUES (?, ?, ?, ?)';
    await pool.query(query, [email, password, 'event_organizer', nama]);

    res.status(201).json({ message: 'Event organizer berhasil dibuat' });
  } catch (err) {
    console.error('Gagal membuat EO:', err);
    res.status(500).json({ message: 'Terjadi kesalahan saat membuat event organizer' });
  }
};

exports.editEo = async (req, res) => {
  const { id, email, password, nama } = req.body;

  if (!id || !email || !nama) {
    return res.status(400).json({ message: 'ID, email, dan nama wajib diisi' });
  }

  try {
    const sql = `UPDATE users SET email = ?, nama = ?, ${password ? 'password = ?, ' : ''} updated_at = NOW() WHERE id = ? AND role = 'event_organizer'`;
    const params = password ? [email, nama, password, id] : [email, nama, id];
    await pool.query(sql, params);

    res.status(200).json({ message: 'Data EO berhasil diupdate' });
  } catch (err) {
    console.error('Edit EO error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan saat update EO' });
  }
};

exports.deleteEo = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID EO wajib diisi' });
  }

  try {
    const sql = 'DELETE FROM users WHERE id = ? AND role = "event_organizer"';
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'EO tidak ditemukan' });
    }

    res.status(200).json({ message: 'EO berhasil dihapus' });
  } catch (err) {
    console.error('Delete EO error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan saat hapus EO' });
  }
};

exports.getAllEo = async (req, res) => {
  try {
    const sql = 'SELECT id, email, nama, created_at FROM users WHERE role = "event_organizer"';
    const [eoList] = await pool.query(sql);
    res.status(200).json({ data: eoList });
  } catch (err) {
    console.error('Get all EO error:', err);
    res.status(500).json({ message: 'Gagal mengambil data EO' });
  }
};

exports.getEoById = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID wajib diisi' });
  }

  try {
    const sql = 'SELECT id, email, nama, created_at FROM users WHERE id = ? AND role = "event_organizer"';
    const [eo] = await pool.query(sql, [id]);

    if (eo.length === 0) {
      return res.status(404).json({ message: 'EO tidak ditemukan' });
    }

    res.status(200).json({ data: eo[0] });
  } catch (err) {
    console.error('Get EO by ID error:', err);
    res.status(500).json({ message: 'Gagal mengambil data EO' });
  }
};

// =============================
// DISKON: Tambah, Edit, Hapus
// =============================

exports.createDiskon = async (req, res) => {
  const { kode, potongan, tipe, batas_pakai } = req.body;

  if (!kode || !potongan || !tipe) {
    return res.status(400).json({ message: 'Kode, potongan, dan tipe wajib diisi' });
  }

  try {
    const [exist] = await pool.query('SELECT id FROM discount_codes WHERE kode = ?', [kode]);
    if (exist.length > 0) {
      return res.status(409).json({ message: 'Kode diskon sudah terdaftar' });
    }

    await pool.query(
      'INSERT INTO discount_codes (kode, potongan, tipe, batas_pakai) VALUES (?, ?, ?, ?)',
      [kode, potongan, tipe, batas_pakai || null]
    );

    res.status(201).json({ message: 'Diskon berhasil ditambahkan' });
  } catch (err) {
    console.error('Create Diskon Error:', err);
    res.status(500).json({ message: 'Gagal menambahkan diskon' });
  }
};

exports.editDiskon = async (req, res) => {
  const { id, kode, potongan, tipe, batas_pakai, aktif } = req.body;

  if (!id || !kode || !potongan || !tipe) {
    return res.status(400).json({ message: 'Field wajib diisi' });
  }

  try {
    await pool.query(
      'UPDATE discount_codes SET kode = ?, potongan = ?, tipe = ?, batas_pakai = ?, aktif = ? WHERE id = ?',
      [kode, potongan, tipe, batas_pakai || null, aktif !== false, id]
    );

    res.status(200).json({ message: 'Diskon berhasil diupdate' });
  } catch (err) {
    console.error('Edit Diskon Error:', err);
    res.status(500).json({ message: 'Gagal mengupdate diskon' });
  }
};

exports.deleteDiskon = async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: 'ID wajib diisi' });

  try {
    await pool.query('DELETE FROM discount_codes WHERE id = ?', [id]);
    res.status(200).json({ message: 'Diskon berhasil dihapus' });
  } catch (err) {
    console.error('Delete Diskon Error:', err);
    res.status(500).json({ message: 'Gagal menghapus diskon' });
  }
};

exports.getAllDiskon = async (req, res) => {
  try {
    const [diskon] = await pool.query('SELECT * FROM discount_codes ORDER BY id DESC');
    res.status(200).json({ data: diskon });
  } catch (err) {
    console.error('Get All Diskon Error:', err);
    res.status(500).json({ message: 'Gagal mengambil data diskon' });
  }
};

exports.getDiskonById = async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: 'ID wajib diisi' });

  try {
    const [diskon] = await pool.query('SELECT * FROM discount_codes WHERE id = ?', [id]);
    if (diskon.length === 0) {
      return res.status(404).json({ message: 'Diskon tidak ditemukan' });
    }
    res.status(200).json({ data: diskon[0] });
  } catch (err) {
    console.error('Get Diskon by ID Error:', err);
    res.status(500).json({ message: 'Gagal mengambil data diskon' });
  }
};
