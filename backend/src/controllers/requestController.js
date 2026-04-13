const pool = require('../config/db');

const RATES = {
  standard:   5.00,
  vip:        17.99,
  handicap:   11.99,
  electrique: 13.99,
};

/* GET /api/rates — tarifs publics */
exports.getRates = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM spot_rates ORDER BY hourly_rate');
    res.json(rows);
  } catch {
    res.json(Object.entries(RATES).map(([spot_type, hourly_rate]) => ({ spot_type, hourly_rate })));
  }
};

/* POST /api/requests — client soumet une demande */
exports.create = async (req, res) => {
  try {
    const {
      first_name, last_name, phone, email,
      plate, model, color,
      spot_id, floor, spot_type, planned_duration,
    } = req.body;

    if (!first_name || !last_name || !phone || !email)
      return res.status(400).json({ error: 'Informations personnelles manquantes' });
    if (!plate || !model || !color)
      return res.status(400).json({ error: 'Informations véhicule manquantes' });
    if (!spot_id || !floor)
      return res.status(400).json({ error: 'Veuillez choisir une place' });

    // Vérifier la place est libre
    const spotCheck = await pool.query(
      "SELECT id, spot_type, status FROM parking_spots WHERE id=$1",
      [spot_id]
    );
    if (!spotCheck.rows.length)
      return res.status(404).json({ error: 'Place introuvable' });
    if (spotCheck.rows[0].status !== 'libre')
      return res.status(409).json({ error: 'Cette place n\'est plus disponible' });

    const sType    = spot_type || spotCheck.rows[0].spot_type || 'standard';
    const rate     = RATES[sType] || 5.00;
    const duration = parseInt(planned_duration) || 1;
    const total    = (rate * duration).toFixed(2);

    // Créer la demande
    const { rows } = await pool.query(
      `INSERT INTO parking_requests
        (first_name, last_name, phone, email, plate, model, color,
         spot_id, floor, spot_type, planned_duration, hourly_rate, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [first_name, last_name, phone, email, plate.toUpperCase(), model, color,
       spot_id, floor, sType, duration, rate, total]
    );

    // Réserver temporairement la place
    await pool.query(
      "UPDATE parking_spots SET status='reservee' WHERE id=$1",
      [spot_id]
    );

    res.status(201).json({
      ...rows[0],
      message: 'Demande envoyée ! En attente d\'approbation de l\'administrateur.',
    });
  } catch (err) {
    console.error('request.create:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* GET /api/requests — admin voit toutes les demandes */
exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT r.*,
        ps.zone, ps.spot_number,
        u.first_name AS admin_first_name, u.last_name AS admin_last_name
      FROM parking_requests r
      LEFT JOIN parking_spots ps ON r.spot_id = ps.id
      LEFT JOIN users         u  ON r.approved_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); sql += ` AND r.status=$${params.length}`; }
    sql += ' ORDER BY r.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('request.getAll:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* POST /api/requests/:id/approve — admin approuve */
exports.approve = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Vérifier la demande
    const reqCheck = await client.query(
      "SELECT * FROM parking_requests WHERE id=$1 AND status='pending'",
      [id]
    );
    if (!reqCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });
    }
    const r = reqCheck.rows[0];

    // 1. Créer ou trouver le user
    let userId;
    const userCheck = await client.query('SELECT id FROM users WHERE email=$1', [r.email]);
    if (userCheck.rows.length) {
      userId = userCheck.rows[0].id;
    } else {
      const bcrypt = require('bcryptjs');
      const hash   = await bcrypt.hash(r.phone, 10);
      const newUser = await client.query(
        `INSERT INTO users (first_name, last_name, email, phone, password_hash)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [r.first_name, r.last_name, r.email, r.phone, hash]
      );
      userId = newUser.rows[0].id;
    }

    // 2. Créer ou trouver le véhicule
    let vehicleId;
    const vCheck = await client.query('SELECT id FROM vehicles WHERE plate=$1', [r.plate]);
    if (vCheck.rows.length) {
      vehicleId = vCheck.rows[0].id;
    } else {
      const newV = await client.query(
        'INSERT INTO vehicles (user_id, plate, model, color) VALUES ($1,$2,$3,$4) RETURNING id',
        [userId, r.plate, r.model, r.color]
      );
      vehicleId = newV.rows[0].id;
    }

    // 3. Marquer la place comme occupée
    await client.query(
      "UPDATE parking_spots SET status='occupee' WHERE id=$1",
      [r.spot_id]
    );

    // 4. Créer la session
    const session = await client.query(
      `INSERT INTO sessions (vehicle_id, spot_id, planned_duration)
       VALUES ($1,$2,$3) RETURNING id`,
      [vehicleId, r.spot_id, r.planned_duration]
    );

    // 5. Mettre à jour la demande
    await client.query(
      `UPDATE parking_requests
       SET status='approved', approved_by=$1, approved_at=NOW(),
           barrier_opened=TRUE, session_id=$2
       WHERE id=$3`,
      [req.user.id, session.rows[0].id, id]
    );

    await client.query('COMMIT');

    res.json({
      message: '✅ Demande approuvée — Barrière ouverte !',
      session_id: session.rows[0].id,
      barrier: 'OPEN',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('request.approve:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

/* POST /api/requests/:id/reject — admin rejette */
exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { rows } = await pool.query(
      "SELECT spot_id FROM parking_requests WHERE id=$1 AND status='pending'",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Demande introuvable' });

    // Libérer la place
    await pool.query(
      "UPDATE parking_spots SET status='libre' WHERE id=$1",
      [rows[0].spot_id]
    );

    await pool.query(
      "UPDATE parking_requests SET status='rejected', approved_by=$1, approved_at=NOW() WHERE id=$2",
      [req.user.id, id]
    );

    res.json({ message: 'Demande rejetée — Place libérée' });
  } catch (err) {
    console.error('request.reject:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* GET /api/requests/:id/status — client vérifie son statut */
exports.getStatus = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.status, r.barrier_opened, r.approved_at,
              r.first_name, r.last_name, r.plate, r.floor,
              r.spot_type, r.total_amount, r.planned_duration,
              ps.zone, ps.spot_number
       FROM parking_requests r
       LEFT JOIN parking_spots ps ON r.spot_id = ps.id
       WHERE r.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Demande introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};