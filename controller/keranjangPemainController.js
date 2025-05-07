const pool = require('../config/db');
const midtransClient = require('midtrans-client');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Konfigurasi multer
const uploadDir = path.join(__dirname, '../uploads/foto-pemain');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung'), false);
  }
};

exports.upload = multer({ storage, fileFilter });
exports.addToKeranjang = async (req, res) => {
  const {
    nama_pemain,
    tanggal_lahir,
    tempat_lahir,
    no_punggung,
    posisi,
    nik,
    nis
  } = req.body;

  const id_club = req.team.id;
  const teamType = req.team.type; // 'club' atau 'sekolah'
  const foto_pemain = req.file ? `/uploads/foto-pemain/${req.file.filename}` : null;

  if (!nama_pemain || !tanggal_lahir || !tempat_lahir || !no_punggung || !posisi) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' });
  }

  if (teamType === 'club' && !nik) {
    return res.status(400).json({ message: 'NIK wajib diisi untuk club.' });
  }

  if (teamType === 'sekolah' && !nis) {
    return res.status(400).json({ message: 'NIS wajib diisi untuk sekolah.' });
  }

  try {
    // Validasi ke keranjang_pemain dan pemain
    let query = '';
    let value = '';
    let keterangan = '';

    if (teamType === 'club') {
      query = `
        SELECT id FROM keranjang_pemain WHERE nik = ? AND id_club = ?
        UNION
        SELECT id FROM pemain WHERE nik = ?`;
      value = [nik, id_club, nik];
      keterangan = 'NIK';
    } else {
      query = `
        SELECT id FROM keranjang_pemain WHERE nis = ? AND id_club = ?
        UNION
        SELECT id FROM pemain WHERE nisn = ?`;
      value = [nis, id_club, nis];
      keterangan = 'NIS';
    }

    const [exists] = await pool.query(query, value);

    if (exists.length > 0) {
      // Hapus file jika sudah terupload tapi data gagal
      if (req.file) {
        const filepath = path.join(uploadDir, req.file.filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }

      return res.status(409).json({
        message: `Pemain dengan ${keterangan} ini sudah terdaftar di sistem atau keranjang.`
      });
    }

    // Insert jika tidak duplikat
    await pool.query(
      `INSERT INTO keranjang_pemain (
        nama_pemain, tanggal_lahir, tempat_lahir, no_punggung,
        posisi, id_club, foto_pemain, nik, nis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nama_pemain,
        tanggal_lahir,
        tempat_lahir,
        no_punggung,
        posisi,
        id_club,
        foto_pemain,
        nik || null,
        nis || null
      ]
    );

    return res.status(201).json({ message: 'Pemain berhasil masuk keranjang' });
  } catch (error) {
    console.error("❌ Error addToKeranjang:", error);
    return res.status(500).json({ message: 'Gagal memasukkan ke keranjang' });
  }
};

// Lihat Isi Keranjang
exports.getKeranjang = async (req, res) => {
  const id_club = req.team.id;

  try {
    const [rows] = await pool.query(`SELECT * FROM keranjang_pemain WHERE id_club = ?`, [id_club]);

    const result = rows.map(pemain => ({
      ...pemain,
      foto_url: pemain.foto_pemain ? `http://localhost:3000${pemain.foto_pemain}` : null
    }));

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil keranjang' });
  }
};

// Hapus Pemain dari Keranjang
exports.deleteFromKeranjang = async (req, res) => {
  const { id } = req.body;
  const id_club = req.team.id;

  try {
    const [cek] = await pool.query(`SELECT * FROM keranjang_pemain WHERE id = ? AND id_club = ?`, [id, id_club]);
    if (cek.length === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan di keranjang' });
    }

    await pool.query(`DELETE FROM keranjang_pemain WHERE id = ? AND id_club = ?`, [id, id_club]);
    return res.status(200).json({ message: 'Berhasil dihapus dari keranjang' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal menghapus data' });
  }
};


// Checkout Keranjang
exports.checkoutKeranjang = async (req, res) => {
  const id_club = req.team.id;
  const nama_club = req.team.name;
  const username = req.team.username;
  const { kode_diskon } = req.body;

  try {
    const [rows] = await pool.query(`SELECT * FROM keranjang_pemain WHERE id_club = ?`, [id_club]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Keranjang kosong' });
    }

    let totalAmount = rows.length * 5000;
    let keterangan_diskon = null;

    if (kode_diskon) {
      const [diskonRows] = await pool.query(`SELECT * FROM discount_codes WHERE kode = ? AND aktif = TRUE`, [kode_diskon]);

      if (diskonRows.length === 0) {
        return res.status(400).json({ message: 'Kode diskon tidak valid atau tidak aktif' });
      }

      const diskon = diskonRows[0];

      if (diskon.batas_pakai !== null && diskon.terpakai >= diskon.batas_pakai) {
        return res.status(400).json({ message: 'Kode diskon sudah mencapai batas pemakaian' });
      }

      if (diskon.tipe === 'nominal') {
        totalAmount -= diskon.potongan;
      } else if (diskon.tipe === 'persen') {
        totalAmount -= Math.floor((diskon.potongan / 100) * totalAmount);
      }

      if (totalAmount < 0) totalAmount = 0;
      keterangan_diskon = diskon.kode;

      await pool.query(`UPDATE discount_codes SET terpakai = terpakai + 1 WHERE id = ?`, [diskon.id]);
    }

    const order_id = 'ORDER-' + Date.now();

    await pool.query(`
      INSERT INTO transaksi_keranjang (id_club, order_id, status)
      VALUES (?, ?, 'pending')
    `, [id_club, order_id]);

    const parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: totalAmount
      },
      customer_details: {
        first_name: nama_club,
        email: username + '@example.com',
        phone: '08123456789'
      }
    };

    const transaction = await snap.createTransaction(parameter);

    return res.status(200).json({
      payment_url: transaction.redirect_url,
      total: totalAmount,
      kode_diskon: keterangan_diskon || null
    });
  } catch (error) {
    console.error(error);

    // Hapus semua file foto jika transaksi gagal
    try {
      const [players] = await pool.query(
        `SELECT foto_pemain FROM keranjang_pemain WHERE id_club = ?`,
        [id_club]
      );

      players.forEach(player => {
        if (player.foto_pemain) {
          const filePath = path.join(__dirname, '..', player.foto_pemain);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Foto dihapus:', filePath);
          }
        }
      });
    } catch (cleanupError) {
      console.error('❌ Error saat hapus file pemain setelah gagal checkout:', cleanupError.message);
    }

    return res.status(500).json({ message: 'Gagal checkout keranjang' });
  }
};


// Webhook Callback dari Midtrans
exports.midtransCallback = async (req, res) => {
  const notification = req.body;
  const orderId = notification.order_id;

  try {
    console.log("📩 Notifikasi Midtrans diterima:", notification);

    // Ambil data transaksi
    const [rows] = await pool.query(
      `SELECT * FROM transaksi_keranjang WHERE order_id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order ID tidak ditemukan' });
    }

    const id_club = rows[0].id_club;

    // Cek status pembayaran
    const isSuccess =
      notification.transaction_status === 'capture' &&
      notification.fraud_status === 'accept';

    const isSettlement = notification.transaction_status === 'settlement';

    if (isSuccess || isSettlement) {
      // Ambil tipe club: club / sekolah
      const [teamData] = await pool.query(
        `SELECT type FROM teams WHERE id = ?`,
        [id_club]
      );

      if (!teamData || teamData.length === 0) {
        return res.status(400).json({ message: 'Tipe tim tidak ditemukan' });
      }

      const teamType = teamData[0].type;

      // Ambil semua pemain dari keranjang
      const [players] = await pool.query(
        `SELECT * FROM keranjang_pemain WHERE id_club = ?`,
        [id_club]
      );

      for (const player of players) {
        let nik = null;
        let nisn = null;

        if (teamType === 'club') {
          nik = player.nik;
        } else if (teamType === 'sekolah') {
          nisn = player.nis;
        }

        // Insert ke tabel pemain
        const [insertRes] = await pool.query(
          `
          INSERT INTO pemain (
            nama_pemain, tanggal_lahir, tempat_lahir, foto_pemain,
            nik, nisn, no_punggung, posisi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            player.nama_pemain,
            player.tanggal_lahir,
            player.tempat_lahir,
            player.foto_pemain,
            nik,
            nisn,
            player.no_punggung,
            player.posisi,
          ]
        );

        const pemainId = insertRes.insertId;

        // Insert ke player_teams
        await pool.query(
          `
          INSERT INTO player_teams (pemain_id, team_id, status)
          VALUES (?, ?, 'aktif')
        `,
          [pemainId, id_club]
        );
      }

      // Kosongkan keranjang
      await pool.query(
        `DELETE FROM keranjang_pemain WHERE id_club = ?`,
        [id_club]
      );

      // Update status transaksi
      await pool.query(
        `UPDATE transaksi_keranjang SET status = 'success' WHERE order_id = ?`,
        [orderId]
      );

      return res.status(200).json({ message: 'Notifikasi berhasil diproses' });
    } else {
      return res.status(200).json({ message: 'Transaksi belum sukses, diabaikan' });
    }
  } catch (error) {
    console.error("🔥 ERROR WEBHOOK:", error);
    return res.status(500).json({ message: 'Gagal proses webhook' });
  }
};
