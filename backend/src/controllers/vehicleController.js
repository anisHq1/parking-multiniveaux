const pool = require('../config/db');

exports.getVehicles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.addVehicle = async (req, res) => {
  const { license_plate, model, color } = req.body;
  if (!license_plate) {
    return res.status(400).json({ message: 'La plaque d’immatriculation est requise' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO vehicles (user_id, license_plate, model, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, license_plate, model, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // violation d'unicité
      return res.status(400).json({ message: 'Cette plaque existe déjà' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};