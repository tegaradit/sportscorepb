const pool = require('../../config/db')
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../../uploads/news');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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
const upload = multer({ storage, fileFilter }).single('gambar');

exports.upload = upload;


exports.createNews = async (req, res) => {
    const { judul, isi, kategori} = req.body;
    const gambar = req.file ? req.file.filename : null;
    try {
        if (!judul || !isi || !gambar || !kategori) {
            return res.status(400).json({ message: 'Semua field wajib diisi' });
        }
        const sql = 'INSERT INTO news (judul, isi, gambar, kategory_olahraga ,created_at,edited_at) VALUES (?, ?, ?, ?, ?, ?)';
        const params = [judul, isi, gambar, kategori, new Date(), new Date()];
        await pool.query(sql, params);
        res.status(201).json({ message: 'Berita berhasil dibuat' });
    } catch (error) {
        console.error('Gagal membuat berita:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat membuat berita' });
    }
}

exports.editNews = async (req, res) => {
    const { id, judul, isi, kategori } = req.body;

    try {
        // 1. Selalu ambil data terbaru dari DB sebagai acuan
        const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Berita tidak ditemukan' });
        }
        const currentNews = rows[0];

        // 2. Siapkan array untuk membangun query secara dinamis
        const setClauses = [];
        const params = [];

        // 3. Bandingkan setiap field. Jika ada dan BERBEDA, tambahkan ke query.
        if (judul && judul !== currentNews.judul) {
            setClauses.push('judul = ?');
            params.push(judul);
        }
        if (isi && isi !== currentNews.isi) {
            setClauses.push('isi = ?');
            params.push(isi);
        }
        // Gunakan nama kolom dari DB untuk perbandingan
        if (kategori && kategori !== currentNews.kategori_olahraga) {
            setClauses.push('kategori_olahraga = ?');
            params.push(kategori);
        }

        // 4. Cek apakah ada file gambar baru yang di-upload
        if (req.file) {
            setClauses.push('gambar = ?');
            params.push(req.file.filename);
            
            // Hapus file gambar lama jika ada
            const oldPath = path.join(uploadDir, currentNews.gambar);
            if (currentNews.gambar && fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // 5. Jika tidak ada perubahan sama sekali, langsung kembalikan response
        if (setClauses.length === 0) {
            return res.status(200).json({ message: 'Tidak ada perubahan data yang disimpan.' });
        }

        // 6. Jika ADA perubahan, wajib update kolom 'edited_at'
        setClauses.push('edited_at = ?');
        params.push(new Date());

        // 7. Bangun query SQL final secara dinamis
        const sql = `UPDATE news SET ${setClauses.join(', ')} WHERE id = ?`;
        params.push(id); // Tambahkan ID di akhir untuk klausa WHERE

        // 8. Jalankan query
        await pool.query(sql, params);

        res.status(200).json({ message: 'Berita berhasil diupdate' });
    } catch (error) {
        console.error('Gagal mengupdate berita:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengupdate berita' });
    }
};

exports.deleteNews = async (req, res) => {
    const {id} = req.body;
    try {
        if (!id) {
            return res.status(400).json({ message: 'ID berita wajib diisi' });
        }
        const sql = 'DELETE FROM news WHERE id = ?';
        const params = [id];
        await pool.query(sql, params);
        res.status(200).json({ message: 'Berita berhasil dihapus' });
    } catch (error) {
        console.error('Gagal menghapus berita:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menghapus berita' });
    }
}