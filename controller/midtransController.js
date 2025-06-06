const pool = require('../config/db');

exports.midtransCallback = async (req, res) => {
  const notif = req.body;
  const orderId = notif.order_id;
  const transactionStatus = notif.transaction_status;
  const fraudStatus = notif.fraud_status;

  try {
    console.log(`📥 Callback untuk ${orderId}`);

    const [transaksi] = await pool.query('SELECT * FROM transaksi_keranjang WHERE order_id = ?', [orderId]);
    if (transaksi.length === 0) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const id_club = transaksi[0].id_club;

    const isSuccess = (
      (transactionStatus === 'capture' && fraudStatus === 'accept') ||
      transactionStatus === 'settlement'
    );

    if (isSuccess) {
      if (orderId.startsWith('tim-')) {
        await pool.query('UPDATE teams SET status_akun = ? WHERE id = ?', ['sudah_bayar', id_club]);
        console.log(`✅ Aktivasi akun tim ID ${id_club}`);

      } else if (orderId.startsWith('regpemain-')) {
        const [teamData] = await pool.query('SELECT type FROM teams WHERE id = ?', [id_club]);
        const teamType = teamData[0].type;

        const [data] = await pool.query('SELECT * FROM keranjang_pemain WHERE id_club = ?', [id_club]);

        for (const item of data) {
          if (item.tipe === 'staff') {
            // Validasi: lisensi harus diisi
           

            const [insertStaff] = await pool.query(`
              INSERT INTO staff (nama_staff, tempat_lahir, tanggal_lahir, jabatan, no_hp, foto, gender, lisensi)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.nama_pemain,
                item.tempat_lahir,
                item.tanggal_lahir,
                item.posisi,
                null, // kamu bisa ganti jika ada no_hp
                item.foto_pemain,
                item.gender,
                item.lisensi
              ]
            );

            const staffId = insertStaff.insertId;

            await pool.query(`
              INSERT INTO staff_teams (id_staff, id_team, status, jabatan)
              VALUES (?, ?, 'aktif', ?)`,
              [staffId, id_club, item.posisi]);

          } else {
            const nik = teamType === 'club' ? item.nik : null;
            const nisn = teamType === 'sekolah' ? item.nis : null;

            const [insertRes] = await pool.query(`
              INSERT INTO pemain (
                nama_pemain, tanggal_lahir, tempat_lahir, foto_pemain,
                nik, nisn, no_punggung, posisi, gender
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.nama_pemain,
                item.tanggal_lahir,
                item.tempat_lahir,
                item.foto_pemain,
                nik,
                nisn,
                item.no_punggung,
                item.posisi,
                item.gender
              ]
            );

            const pemainId = insertRes.insertId;

            await pool.query(`
              INSERT INTO player_teams (pemain_id, team_id, status)
              VALUES (?, ?, 'aktif')`,
              [pemainId, id_club]);
          }
        }

        await pool.query('DELETE FROM keranjang_pemain WHERE id_club = ?', [id_club]);
        console.log(`✅ Pemain dan staff dari keranjang dimasukkan ke tim ID ${id_club}`);

      } else if (orderId.startsWith('turnamen-')) {
        console.log(`📌 (Coming Soon) Logic untuk turnamen ID ${id_club}`);
      }

      await pool.query('UPDATE transaksi_keranjang SET status = ? WHERE order_id = ?', ['success', orderId]);
      return res.status(200).send('Berhasil diproses');
    }

    // Jika transaksi gagal/pending
    let statusDb = 'pending';
    if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      statusDb = 'gagal';
      console.log(`❌ Transaksi gagal untuk ${orderId}`);
    } else if (transactionStatus === 'pending') {
      console.log(`⏳ Transaksi pending untuk ${orderId}`);
    }

    await pool.query('UPDATE transaksi_keranjang SET status = ? WHERE order_id = ?', [statusDb, orderId]);
    res.status(200).send('Status disimpan');
    
  } catch (error) {
    console.error('🔥 ERROR CALLBACK:', error);
    res.status(500).json({ message: 'Gagal memproses callback' });
  }
};
