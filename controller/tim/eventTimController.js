const pool = require("../../config/db");

exports.getEventsByTeamId = async (req, res) => {
	const { id } = req.team; // dari token tim login

	try {
		const [rows] = await pool.query(
			`
      SELECT e.id AS eventId, e.logo_event, e.nama_event, e.tanggal_mulai, e.tanggal_selesai, e.kategory_olahraga, e.lokasi, e.penyelenggara
      FROM event_teams et
      JOIN event_categories ec ON et.id_kategori = ec.id
      JOIN events e ON ec.id_event = e.id
      WHERE et.id_team = ?
      GROUP BY e.id, e.logo_event, e.nama_event, e.tanggal_mulai, e.tanggal_selesai, e.kategory_olahraga, e.lokasi, e.penyelenggara
    `,
			[id]
		);

		res.status(200).json(rows);
	} catch (err) {
		console.error("❌ Error getEventKategoriByTeam:", err.message);
		res.status(500).json({ message: "Gagal mengambil data event tim" });
	}
};

exports.managePlayersEventMatch = async (req, res) => {
	const teamId = req.team.id; // dari token tim login
	/**
	 * @type {{ categoryId: number, players: Array<{id: number, no: number}> }}
	 */
	const { categoryId, players } = req.body;

	try {
    // const [ currentPlayers ] = await pool.query(
    //   `SELECT id_pemain as id, no_punggung as no FROM pemain_event WHERE id_kategori = ? AND id_team = ?`,
    //   [categoryId, teamId]
    // );

    // // merge the current players with the new players
    // const mergedPlayers = [...currentPlayers, ...players];

    // make them unique by id
    // const uniquePlayers = players.filter((player, index, self) =>
    //   index === self.findIndex((p) => p.id === player.id)
    // );

    // delete the old players
    await pool.query(
      `DELETE FROM pemain_event WHERE id_kategori = ? AND id_team = ?`,
      [categoryId, teamId]
    );

    if (players.length === 0) {
      return res.status(200).json({ message: "Berhasil mendaftar ke event" });
    }

    // insert the unique players
    const values = players.map((player) => [categoryId, teamId, player.id, player.no]);
    await pool.query(
      `INSERT INTO pemain_event (id_kategori, id_team, id_pemain, no_punggung) VALUES ?`,
      [values]
    );

		res.status(200).json({ message: "Berhasil mendaftar ke event" });
	} catch (err) {
		console.error("❌ Error addPlayersToEventMatch:", err.message);
		res.status(500).json({ message: "Gagal mendaftar ke event" });
	}
};

exports.manageStaffEventMatch = async (req, res) => {
  const teamId = req.team.id; // dari token tim login
  /**
   * @type {{ categoryId: number, staff: Array<{id: number, jabatan: string}> }}
   */
  const { categoryId, staff } = req.body;

  try {
    // Hapus semua staff lama untuk kategori dan tim ini
    await pool.query(
      `DELETE FROM staff_event WHERE id_kategori = ? AND id_team = ?`,
      [categoryId, teamId]
    );

    if (staff.length === 0) {
      return res.status(200).json({ message: "Berhasil mengatur staff event" });
    }

    // Masukkan staff baru
    const values = staff.map((s) => [categoryId, teamId, s.id, s.jabatan]);
    await pool.query(
      `INSERT INTO staff_event (id_kategori, id_team, id_staff, jabatan) VALUES ?`,
      [values]
    );

    res.status(200).json({ message: "Berhasil mengatur staff event" });
  } catch (err) {
    console.error("❌ Error manageStaffEventMatch:", err.message);
    res.status(500).json({ message: "Gagal mengatur staff event" });
  }
};
exports.getStaffEventMatch = async (req, res) => {
  const teamId = req.team.id; // dari token tim login
  const { categoryId } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        se.id AS id_staff_event, 
        se.id_staff AS id, 
        se.jabatan
      FROM staff_event se
      WHERE se.id_kategori = ? AND se.id_team = ?
      `,
      [categoryId, teamId]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error getStaffEventMatch:", err.message);
    res.status(500).json({ message: "Gagal mengambil data staff event" });
  }
};


exports.getPlayersEventMatch = async (req, res) => {
  const teamId = req.team.id; // dari token tim login
  const { categoryId } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT pe.id_pemain AS id, pe.no_punggung AS no, pe.id AS id_pemain_event
      FROM pemain_event pe
      WHERE pe.id_kategori = ? AND pe.id_team = ?
    `,
      [categoryId, teamId]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error getPlayersEventMatch:", err.message);
    res.status(500).json({ message: "Gagal mengambil data pemain event" });
  }
};  