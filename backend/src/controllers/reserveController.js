const pool = require('../config/db');

/* POST /api/reserve */
exports.create = async (req, res) => {
  try {
    const { vehicle_id, spot_id, start_time, end_time } = req.body;
    if (!vehicle_id || !spot_id || !start_time || !end_time)
      return res.status(400).json({ error: 'Champs manquants' });

    // Vérifier disponibilité
    const conflict = await pool.query(
      `SELECT id FROM reservations
       WHERE spot_id=$1 AND status='active'
         AND tsrange(start_time, end_time) && tsrange($2::timestamp, $3::timestamp)`,
      [spot_id, start_time, end_time]
    );
    if (conflict.rows.length)
      return res.status(409).json({ error: 'Cette place est déjà réservée pour ce créneau' });

    const { rows } = await pool.query(
      `INSERT INTO reservations (vehicle_id, spot_id, start_time, end_time)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [vehicle_id, spot_id, start_time, end_time]
    );

    // Marquer la place réservée
    await pool.query("UPDATE parking_spots SET status='reservee' WHERE id=$1", [spot_id]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('reserve:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* GET /api/reserve */
exports.getAll = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let sql = `
      SELECT r.*, v.license_plate, v.brand, v.model, u.prenom, u.nom,
        ps.floor, ps.spot_number, ps.zone
      FROM reservations r
      JOIN vehicles      v  ON r.vehicle_id = v.id
      JOIN users         u  ON v.user_id    = u.id
      JOIN parking_spots ps ON r.spot_id    = ps.id
      WHERE r.status = 'active'
    `;
    const params = [];
    if (!isAdmin) { params.push(req.user.id); sql += ` AND u.id=$${params.length}`; }
    sql += ' ORDER BY r.start_time';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* DELETE /api/reserve/:id */
exports.cancel = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE reservations SET status='cancelled' WHERE id=$1 RETURNING spot_id",
      [req.params.id]
    );
    if (rows.length)
      await pool.query("UPDATE parking_spots SET status='libre' WHERE id=$1", [rows[0].spot_id]);
    res.json({ message: 'Réservation annulée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
