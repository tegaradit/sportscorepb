const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.cookies.admin_token; // atau ganti jadi 'eo_token' kalau mau beda

  if (!token) {
    return res.status(401).json({ message: 'Token EO tidak ditemukan di cookie' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'eo') {
      return res.status(403).json({ message: 'Akses ditolak: bukan EO' });
    }

    req.eo = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token EO tidak valid', error: err.message });
  }
};
