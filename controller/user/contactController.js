const pool = require('../../config/db');

exports.addContact = async (req, res )=>{
    try {
        const { nama, email,subject, pesan } = req.body;
        const sql = `
            INSERT INTO kontak (nama, email, subject, pesan, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `;
        await pool.query(sql, [nama, email, subject, pesan]);
        res.status(201).json({ message: 'Contact added successfully' });

    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

exports.getAllMessages = async (req, res) => {
    try {
        const sql = `
            SELECT id, nama, email, subject, pesan, created_at 
            FROM contact
            ORDER BY created_at DESC
        `;
        const [rows] = await pool.query(sql);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
