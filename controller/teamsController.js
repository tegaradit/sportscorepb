const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const midtransClient = require('midtrans-client');
require('dotenv').config();

// Pastikan folder uploads tersedia
const uploadDir = path.join(__dirname, '../uploads/logo-tim');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi multer untuk upload logo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

exports.upload = upload;

// =======================================
// Register Tim (sekolah/club)
// =======================================
exports.registerTeam = async (req, res) => {
  const {
    name,
    username,
    password,
    type, // 'school' atau 'club'
    tahun_berdiri,
    manager,
    basecamp,
    kontak,
    deskripsi
  } = req.body;

  const logo_club = req.file ? req.file.filename : null;
  const status_akun = "belum_bayar"; // default saat daftar

  if (!name || !username || !password || !type || !tahun_berdiri || !manager) {
    return res.status(400).json({ message: 'Field wajib diisi (minimal)' });
  }

  try {
    // Cek apakah nama tim sudah ada
    const [existing] = await pool.query('SELECT id FROM teams WHERE nama_club = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Nama tim sudah terdaftar, silakan gunakan nama lain.' });
    }

    const sql = `
      INSERT INTO teams 
      (nama_club, username, password, type, logo_club, tahun_berdiri, manager, basecamp, kontak, deskripsi, status_akun) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      name,
      username,
      password,
      type,
      logo_club,
      tahun_berdiri,
      manager,
      basecamp,
      kontak,
      deskripsi,
      status_akun
    ];

    const [result] = await pool.query(sql, values);

    return res.status(201).json({
      message: 'Tim berhasil didaftarkan!',
      data: {
        id: result.insertId,
        name,
        username,
        type,
        logo_club
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

// =======================================
// Login Tim
// =======================================
exports.loginTeam = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }

    const query = 'SELECT * FROM teams WHERE username = ? AND password = ?';
    const [results] = await pool.query(query, [username, password]);

    if (results.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const team = results[0];
    const token = jwt.sign(
      { id: team.id, username: team.username, nama_club: team.nama_club, type: team.type },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    res.status(200).json({
      message: 'Login berhasil',
      token,
      team: {
        id: team.id,
        name: team.nama_club,
        username: team.username,
        type: team.type,
        logo_club: team.logo_club
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// =======================================
// Buat Transaksi Midtrans + Diskon
// =======================================
exports.bayar = async (req, res) => {
  try {
    const { nama_club, id } = req.team; // dari token
    const { kode_diskon } = req.body;

    let total_bayar = 50000;
    let keterangan_diskon = null;   

    if (kode_diskon) {
      const [diskonRows] = await pool.query(`SELECT * FROM discount_codes WHERE kode = ? AND aktif = TRUE`, [kode_diskon]);

      if (diskonRows.length === 0) {
        return res.status(400).json({ message: 'Kode diskon tidak valid atau sudah tidak aktif' });
      }

      const diskon = diskonRows[0];

      if (diskon.batas_pakai !== null && diskon.terpakai >= diskon.batas_pakai) {
        return res.status(400).json({ message: 'Kode diskon sudah mencapai batas pemakaian' });
      }

      if (diskon.tipe === 'nominal') {
        total_bayar -= diskon.potongan;
      } else if (diskon.tipe === 'persen') {
        total_bayar -= Math.floor((diskon.potongan / 100) * total_bayar);
      }

      if (total_bayar < 0) total_bayar = 0;
      keterangan_diskon = diskon.kode;

      await pool.query(`UPDATE discount_codes SET terpakai = terpakai + 1 WHERE id = ?`, [diskon.id]);
    }

    const timestamp = Date.now();
    const order_id = `tim-${nama_club}-${timestamp}`;

    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    const parameter = {
      transaction_details: {
        order_id,
        gross_amount: total_bayar
      },
      customer_details: {
        first_name: nama_club
      },
      enabled_payments: [
        "credit_card", "cimb_clicks", "bca_klikbca", "bca_klikpay", "bri_epay", "echannel", "permata_va",
        "bca_va", "bni_va", "bri_va", "cimb_va", "other_va", "gopay", "indomaret",
        "danamon_online", "akulaku", "shopeepay", "kredivo", "uob_ezpay", "other_qris"
      ]
    };

    const transaction = await snap.createTransaction(parameter);
    await pool.query(`
      INSERT INTO transaksi_keranjang (id_club, order_id, status)
      VALUES (?, ?, ?)
    `, [id, order_id, 'pending']);

    res.status(200).json({
      message: "Transaksi berhasil dibuat",
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      order_id,
      kode_diskon: keterangan_diskon,
      total_setelah_diskon: total_bayar
    });
  } catch (error) {
    console.error("Error saat membuat transaksi:", error.message);
    res.status(500).json({
      message: "Terjadi kesalahan saat memproses pembayaran",
      error: error.message
    });
  }
};

// Midtrans Notification Handler
exports.midtransCallback = async (req, res) => {
  try {
    const notif = req.body;

    const orderId = notif.order_id;
    const transactionStatus = notif.transaction_status;
    const fraudStatus = notif.fraud_status;

    console.log(`📥 Notifikasi diterima untuk order_id: ${orderId}`);
    console.log('Status Transaksi:', transactionStatus);
    console.log('Fraud Status:', fraudStatus);

    // Ambil data transaksi untuk menemukan id_club
    const [rows] = await pool.query('SELECT id_club FROM transaksi_keranjang WHERE order_id = ?', [orderId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const id_club = rows[0].id_club;

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      // Transaksi berhasil
      await pool.query('UPDATE teams SET status_akun = ? WHERE id = ?', ['sudah_bayar', id_club]);
      await pool.query('UPDATE transaksi_keranjang SET status = ? WHERE order_id = ?', ['success', orderId]);
      console.log(`✅ Pembayaran sukses, tim ID ${id_club} diaktifkan.`);
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      // Transaksi gagal/batal
      await pool.query('UPDATE transaksi_keranjang SET status = ? WHERE order_id = ?', ['gagal', orderId]);
      console.log(`❌ Pembayaran gagal untuk order_id ${orderId}`);
    } else if (transactionStatus === 'pending') {
      await pool.query('UPDATE transaksi_keranjang SET status = ? WHERE order_id = ?', ['pending', orderId]);
      console.log(`⏳ Pembayaran masih pending untuk order_id ${orderId}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('🔥 Error saat memproses notifikasi Midtrans:', error);
    res.status(500).json({ message: 'Gagal memproses notifikasi' });
  }
};
