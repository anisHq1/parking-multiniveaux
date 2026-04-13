const pool = require('../config/db');

exports.get = async (req, res) => {
  try {
    const [spots, floors, revToday, rev7, activeSess, todaySess, vehicles, recent] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status='libre')   AS free,
          COUNT(*) FILTER (WHERE status='occupee') AS occupied
          FROM parking_spots`),
        pool.query(`SELECT floor,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status='libre')   AS free,
          COUNT(*) FILTER (WHERE status='occupee') AS occupied,
          ROUND(COUNT(*) FILTER (WHERE status!='libre')*100.0/COUNT(*),0) AS pct
          FROM parking_spots GROUP BY floor ORDER BY floor`),
        pool.query(`SELECT COALESCE(SUM(amount),0) AS today
          FROM sessions WHERE DATE(exit_time)=CURRENT_DATE AND status='completed'`),
        pool.query(`SELECT DATE(exit_time) AS jour, COALESCE(SUM(amount),0) AS total
          FROM sessions
          WHERE exit_time >= NOW()-INTERVAL '7 days' AND status='completed'
          GROUP BY DATE(exit_time) ORDER BY jour`),
        pool.query("SELECT COUNT(*) AS count FROM sessions WHERE status='active'"),
        pool.query("SELECT COUNT(*) AS count FROM sessions WHERE DATE(entry_time)=CURRENT_DATE"),
        pool.query('SELECT COUNT(*) AS count FROM vehicles'),
        pool.query(`SELECT s.id, s.entry_time, s.exit_time, s.status, s.amount,
          v.plate, v.model, v.color,
          u.first_name, u.last_name,
          ps.floor, ps.spot_number, ps.zone
          FROM sessions s
          JOIN vehicles      v  ON s.vehicle_id=v.id
          JOIN users         u  ON v.user_id=u.id
          JOIN parking_spots ps ON s.spot_id=ps.id
          ORDER BY s.entry_time DESC LIMIT 10`),
      ]);

    res.json({
      spots:   spots.rows[0],
      floors:  floors.rows,
      revenue: {
        today:     parseFloat(revToday.rows[0].today),
        last7days: rev7.rows,
      },
      sessions: {
        active: parseInt(activeSess.rows[0].count),
        today:  parseInt(todaySess.rows[0].count),
      },
      vehicles:       parseInt(vehicles.rows[0].count),
      recentActivity: recent.rows,
    });
  } catch (err) {
    console.error('dashboard:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};