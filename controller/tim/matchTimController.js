const pool = require("../../config/db");

exports.getMatchByCategoryId = async (req, res) => {
	const { id } = req.team; // dari token tim login
	const { categoryId } = req.params;

	try {
		const [rows] = await pool.query(
      `
         SELECT t1.nama_club AS team_1_name, t2.nama_club AS team_2_name, t1.logo_club AS team_1_logo, t2.logo_club AS team_2_logo, waktu, matches.id
         FROM matches 
         JOIN teams t1 ON matches.team_1 = t1.id
         JOIN teams t2 ON matches.team_2 = t2.id
         WHERE (team_1 = ? OR team_2 = ?) AND id_kategori = ? AND status = 'belum_main'
      `,
			[id, id, categoryId]
		);

		res.status(200).json(rows);
	} catch (err) {
		console.error("❌ Error getMatchByCategoryId:", err.message);
		res.status(500).json({ message: "Gagal mengambil data pertandingan" });
	}
};
