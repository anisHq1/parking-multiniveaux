const pool = require('../config/db');

const SpotModel = {
  findAll: ({ floor, status } = {}) => {
    let sql = `
      SELECT ps.*,
        v.plate, v.model, v.color,
        u.first_name, u.last_name, u.phone,
        s.id AS session_id, s.entry_time, s.planned_duration
      FROM parking_spots ps
      LEFT JOIN sessions      s  ON s.spot_id    = ps.id AND s.status = 'active'
      LEFT JOIN vehicles      v  ON s.vehicle_id = v.id
      LEFT JOIN users         u  ON v.user_id    = u.id
      WHERE 1=1
    `;
    const params = [];
    if (floor)  { params.push(floor);  sql += ` AND ps.floor = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND ps.status = $${params.length}`; }
    sql += ' ORDER BY ps.floor, ps.spot_number';
    return pool.query(sql, params);
  },

  summary: () =>
    pool.query(`
      SELECT floor,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='libre')   AS free,
        COUNT(*) FILTER (WHERE status='occupee') AS occupied,
        ROUND(COUNT(*) FILTER (WHERE status!='libre')*100.0/COUNT(*),0) AS pct
      FROM parking_spots
      GROUP BY floor ORDER BY floor
    `),

  totalSummary: () =>
    pool.query(`
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='libre')   AS free,
        COUNT(*) FILTER (WHERE status='occupee') AS occupied
      FROM parking_spots
    `),

  update: (id, { status, spot_type }) =>
    pool.query(
      'UPDATE parking_spots SET status=$1, spot_type=$2 WHERE id=$3 RETURNING *',
      [status, spot_type, id]
    ),
};

module.exports = SpotModel;