const pool = require('../../config/db');

exports.getAllPlayers = async (req, res) => {
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
            totalPlayers: total,
            players: rows
        });
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.detailPlayer = async (req, res) => {
    try {
        const playerId = req.params.id;

        // 1. Data dasar pemain
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
        `;

        // 2. Riwayat event/kategori yang pernah diikuti pemain
const sql2 = `
    SELECT 
        k.nama_kategori, 
        pe.no_punggung, 
        pe.jumlah_gol, 
        t.nama_club,
        t.logo_club,
        (
            SELECT COUNT(*) 
            FROM match_lineup l 
            WHERE l.id_pemain_event = pe.id
        ) AS jumlah_match
    FROM pemain_event pe
    JOIN event_categories k ON pe.id_kategori = k.id
    JOIN teams t ON pe.id_team = t.id
    WHERE pe.id_pemain = ?
`;


        // 3. Daftar match yang pernah dimainkan pemain
const sql3 = `
    SELECT 
        m.id AS id_match,
        m.waktu,
        t1.nama_club AS nama_team_1,
        t1.logo_club AS logo_team_1,
        t2.nama_club AS nama_team_2,
        t2.logo_club AS logo_team_2,
        m.skor_1,
        m.skor_2,
        k.nama_kategori,
        k.gender
    FROM 
        match_lineup l
    JOIN 
        pemain_event pe ON l.id_pemain_event = pe.id
    JOIN 
        matches m ON l.id_match = m.id
    JOIN 
        event_categories k ON m.id_kategori = k.id
    JOIN 
        teams t1 ON m.team_1 = t1.id
    JOIN 
        teams t2 ON m.team_2 = t2.id
    WHERE 
        pe.id_pemain = ?
        AND pe.id_kategori = m.id_kategori
    GROUP BY 
        m.id, m.waktu, t1.nama_club, t1.logo_club,
        t2.nama_club, t2.logo_club,
        m.skor_1, m.skor_2, k.nama_kategori, k.gender
    ORDER BY 
        m.waktu DESC
`;
        // Eksekusi semua query
        const [rows] = await pool.query(sql, [playerId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }

        const [eventData] = await pool.query(sql2, [playerId]);
        const [matchData] = await pool.query(sql3, [playerId]);

        // Hasil akhir JSON
        res.status(200).json({
            player: rows[0],
            eventData,
            matchData
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


