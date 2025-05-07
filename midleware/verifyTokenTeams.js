const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan di cookie' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validasi isi token
    if (!decoded.nama_club || !decoded.id || !decoded.username || !decoded.type) {
      return res.status(403).json({ message: 'Token tidak valid untuk tim/club' });
    }

    req.team = decoded; // token valid → pasang data ke req.team
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid', error: err.message });
  }
};
