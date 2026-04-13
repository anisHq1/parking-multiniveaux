const jwt  = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'Token manquant' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, email, phone, role FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Utilisateur introuvable' });

    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Accès admin requis' });
  next();
};

module.exports = { protect, adminOnly };