const pool = require('../config/db');

const VehicleModel = {
  findByPlate: (plate) =>
    pool.query('SELECT * FROM vehicles WHERE plate = $1', [plate.toUpperCase()]),

  findAllAdmin: () =>
    pool.query(`
      SELECT v.*,
        u.first_name, u.last_name, u.phone,
        (s.id IS NOT NULL) AS is_parked,
        s.id AS session_id,
        ps.floor, ps.spot_number, ps.zone
      FROM vehicles v
      LEFT JOIN users         u  ON v.user_id    = u.id
      LEFT JOIN sessions      s  ON s.vehicle_id = v.id AND s.status = 'active'
      LEFT JOIN parking_spots ps ON s.spot_id    = ps.id
      ORDER BY v.created_at DESC
    `),

  findByUser: (userId) =>
    pool.query(`
      SELECT v.*,
        (s.id IS NOT NULL) AS is_parked,
        s.id AS session_id,
        ps.floor, ps.spot_number, ps.zone
      FROM vehicles v
      LEFT JOIN sessions      s  ON s.vehicle_id = v.id AND s.status = 'active'
      LEFT JOIN parking_spots ps ON s.spot_id    = ps.id
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC
    `, [userId]),

  create: ({ user_id, plate, model, color }) =>
    pool.query(
      `INSERT INTO vehicles (user_id, plate, model, color)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [user_id, plate.toUpperCase(), model, color]
    ),

  update: (id, userId, { model, color }) =>
    pool.query(
      `UPDATE vehicles SET model=$1, color=$2
       WHERE id=$3 AND user_id=$4 RETURNING *`,
      [model, color, id, userId]
    ),

  delete: (id, userId) =>
    pool.query('DELETE FROM vehicles WHERE id=$1 AND user_id=$2', [id, userId]),
};

module.exports = VehicleModel;