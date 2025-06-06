const pool = require('../../config/db');

exports.getAllStaff = async (req, res) => {
  const { id } = req.team; // ID team dari token

  try {
    const [rows] = await pool.query(`
      SELECT s.* 
      FROM staff_teams st
      JOIN staff s ON st.id_staff = s.id
      WHERE st.id_team = ?
    `, [id]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error getAllStaff:', err.message);
    res.status(500).json({ message: 'Gagal ambil staff' });
  }
};

