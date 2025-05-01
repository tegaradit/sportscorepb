const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Disesuaikan field token nya
    if (!decoded.nama_club || !decoded.id || !decoded.username || !decoded.type) {
      return res.status(403).json({ message: 'Token tidak valid untuk tim/club' });
    }
    req.team = decoded; // pasang hasil decoding ke req.team
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid', error: err.message });
  }
};
