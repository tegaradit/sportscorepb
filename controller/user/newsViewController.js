const pool = require("../../config/db");

exports.getNews = async (req, res) => {
    try {
        const limit = 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const [dataPromise, countPromise] = await Promise.all([
            pool.query(
                `SELECT id, judul, isi, gambar, kategori_olahraga, created_at, edited_at
                 FROM news
                 ORDER BY created_at DESC
                 LIMIT ?
                 OFFSET ?`,
                [limit, offset]
            ),
            pool.query('SELECT COUNT(*) as total FROM news')
        ]);
        const [rows] = dataPromise;
        const [countRows] = countPromise;
        const totalItems = countRows[0].total;
        const totalPages = Math.ceil(totalItems / limit);
        res.status(200).json({
            message: "Berita berhasil diambil",
            data: rows,
            pagination: {
                totalItems: totalItems,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (err) {
        console.error("❌ Error getNews:", err.message);
        res.status(500).json({ message: "Gagal mengambil berita" });
    }
};
exports.getNewsById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT n.id, n.judul, n.isi, n.tanggal, n.gambar, u.nama AS penulis
             FROM news n
             JOIN users u ON n.id_penulis = u.id
             WHERE n.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Berita tidak ditemukan" });
        }

        res.status(200).json({
            message: "Berita berhasil diambil",
            data: rows[0]
        });
    } catch (err) {
        console.error("❌ Error getNewsById:", err.message);
        res.status(500).json({ message: "Gagal mengambil berita" });
    }
};