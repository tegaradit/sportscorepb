const pool = require('../config/db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../uploads/foto-pemain');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'pemain-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });
exports.uploadFotoPemain = upload.single('foto_pemain');

exports.getAllPemain = async (req, res) => {
    const id_club = req.team.id;
  
    try {
      const [rows] = await pool.query(`
        SELECT * FROM pemain WHERE id_club = ?
      `, [id_club]);
  
      return res.status(200).json({ data: rows });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Gagal mengambil data pemain' });
    }
  };
  
  // GET Pemain by ID
  exports.getPemainById = async (req, res) => {
    const { id } = req.body;
    const id_club = req.team.id;
  
    try {
      const [rows] = await pool.query(`
        SELECT * FROM pemain WHERE id = ? AND id_club = ?
      `, [id, id_club]);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Pemain tidak ditemukan' });
      }
  
      return res.status(200).json({ data: rows[0] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Gagal mengambil data pemain' });
    }
  };
  
  exports.editPemain = async (req, res) => {
    const { id } = req.body;
    const id_club = req.team.id
    const foto_pemain = req.file ? req.file.filename : null;
  
    if (!id || !id_club) {
      return res.status(400).json({ message: 'id dan id_club wajib dikirim' });
    }
  
    try {
      const [cek] = await pool.query(`SELECT * FROM pemain WHERE id = ? AND id_club = ?`, [id, id_club]);
      if (cek.length === 0) {
        return res.status(404).json({ message: 'Pemain tidak ditemukan' });
      }
  
      const fields = [];
      const values = [];
  
      if (req.body.nama_pemain) {
        fields.push('nama_pemain = ?');
        values.push(req.body.nama_pemain);
      }
      if (req.body.tanggal_lahir) {
        fields.push('tanggal_lahir = ?');
        values.push(req.body.tanggal_lahir);
      }
      if (req.body.tempat_lahir) {
        fields.push('tempat_lahir = ?');
        values.push(req.body.tempat_lahir);
      }
      if (req.body.no_punggung) {
        fields.push('no_punggung = ?');
        values.push(req.body.no_punggung);
      }
      if (req.body.posisi) {
        fields.push('posisi = ?');
        values.push(req.body.posisi);
      }
      if (foto_pemain) {
        // hapus foto lama
        if (cek[0].foto_pemain) {
          const oldPath = path.join(uploadDir, cek[0].foto_pemain);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        fields.push('foto_pemain = ?');
        values.push(foto_pemain);
      }
  
      if (fields.length === 0) {
        return res.status(400).json({ message: 'Tidak ada field yang dikirim untuk diupdate' });
      }
  
      // Tambah updated_at dan where clause
      fields.push('updated_at = NOW()');
      const query = `UPDATE pemain SET ${fields.join(', ')} WHERE id = ? AND id_club = ?`;
      values.push(id, id_club);
  
      await pool.query(query, values);
      return res.status(200).json({ message: 'Pemain berhasil diupdate' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Gagal update pemain' });
    }
  };
  