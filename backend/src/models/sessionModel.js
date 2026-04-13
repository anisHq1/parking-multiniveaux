const pool = require('../config/db');
const RATE = 5;

const SessionModel = {
  findAll: ({ status, floor, userId, isAdmin, limit = 50, offset = 0 } = {}) => {
    let sql = `
      SELECT s.*,
        v.plate, v.model, v.color,
        u.first_name, u.last_name, u.phone,
        ps.floor, ps.spot_number, ps.zone,
        CASE
          WHEN s.exit_time IS NULL
          THEN GREATEST(${RATE}, ROUND(EXTRACT(EPOCH FROM (NOW()-s.entry_time))/3600*${RATE},2))
          ELSE s.amount
        END AS current_amount
      FROM sessions s
      JOIN vehicles      v  ON s.vehicle_id = v.id
      JOIN users         u  ON v.user_id    = u.id
      JOIN parking_spots ps ON s.spot_id    = ps.id
      WHERE 1=1
    `;
    const p = [];
    if (status)   { p.push(status); sql += ` AND s.status=$${p.length}`; }
    if (floor)    { p.push(floor);  sql += ` AND ps.floor=$${p.length}`; }
    if (!isAdmin) { p.push(userId); sql += ` AND u.id=$${p.length}`; }
    sql += ' ORDER BY s.entry_time DESC';
    p.push(limit);  sql += ` LIMIT $${p.length}`;
    p.push(offset); sql += ` OFFSET $${p.length}`;
    return pool.query(sql, p);
  },

  findById: (id) =>
    pool.query(`
      SELECT s.*, v.plate, v.model, v.color,
        u.first_name, u.last_name,
        ps.floor, ps.spot_number, ps.zone
      FROM sessions s
      JOIN vehicles      v  ON s.vehicle_id = v.id
      JOIN users         u  ON v.user_id    = u.id
      JOIN parking_spots ps ON s.spot_id    = ps.id
      WHERE s.id=$1
    `, [id]),

  create: (client, { vehicle_id, spot_id, planned_duration }) =>
    client.query(
      'INSERT INTO sessions (vehicle_id, spot_id, planned_duration) VALUES ($1,$2,$3) RETURNING *',
      [vehicle_id, spot_id, planned_duration || 2]
    ),

  complete: (client, id) =>
    client.query(
      `UPDATE sessions
       SET exit_time=NOW(),
           amount=GREATEST(${RATE}, ROUND(EXTRACT(EPOCH FROM (NOW()-entry_time))/3600*${RATE},2)),
           status='completed', payment_status='paid'
       WHERE id=$1 RETURNING *`,
      [id]
    ),
};

module.exports = SessionModel;