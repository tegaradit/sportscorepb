const pool = require('../../config/db');

exports.getAllPemain= async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const search = req.query.search || '';
        const searchQuery = `%${search}%`;

        const sql = `
            SELECT id, nama_pemain, foto_pemain 
            FROM pemain 
            WHERE nama_pemain LIKE ? 
            LIMIT ? OFFSET ?
        `;
        const [rows] = await pool.query(sql, [searchQuery, limit, offset]);

        const countSql = `
            SELECT COUNT(*) as total 
            FROM pemain 
            WHERE nama_pemain LIKE ?
        `;
        const [[{ total }]] = await pool.query(countSql, [searchQuery]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            currentPage: page,
            totalPages,
            totalPemain: total,
            pemain: rows
        });
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

exports.detailPemain = async (req, res) => {
    const pemainId = req.params.pemainId
    try{
        const sql = `
                SELECT 
            p.id, 
            p.nama_pemain, 
            p.foto_pemain, 
            p.no_punggung, 
            p.posisi,
            p.gender, 
            p.tanggal_lahir, 
            p.tempat_lahir
        FROM pemain p
        WHERE p.id = ?  
        `
        const [rows] = await pool.query(sql, [pemainId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        res.status(200).json(rows[0]);
    }
    catch (error) {
        console.error('Error fetching player details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

exports.transferPemain = async (req, res) => {
    const {pemainId, teamId} = req.body;
    try {
        
    }catch (error) {

    }
}