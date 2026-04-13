const pool         = require('../config/db');
const SessionModel = require('../models/sessionModel');
const SpotModel    = require('../models/spotModel');

/* POST /api/entry — Enregistrer une entrée */
exports.entry = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { vehicle_id, spot_id, planned_duration } = req.body;
    if (!vehicle_id || !spot_id)
      return res.status(400).json({ error: 'vehicle_id et spot_id sont requis' });

    // Vérifier la place est libre
    const spotCheck = await client.query(
      "SELECT * FROM parking_spots WHERE id=$1 AND status='libre'",
      [spot_id]
    );
    if (!spotCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Place non disponible' });
    }

    // Vérifier que le véhicule n'est pas déjà garé
    const activeCheck = await client.query(
      "SELECT id FROM sessions WHERE vehicle_id=$1 AND status='active'",
      [vehicle_id]
    );
    if (activeCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce véhicule est déjà garé' });
    }

    // Créer la session
    const session = await SessionModel.create(client, { vehicle_id, spot_id, planned_duration });

    // Marquer la place comme occupée
    await client.query(
      "UPDATE parking_spots SET status='occupee' WHERE id=$1",
      [spot_id]
    );

    await client.query('COMMIT');

    // Retourner la session enrichie
    const full = await SessionModel.findById(session.rows[0].id);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('entry:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

/* POST /api/sortie/:sessionId — Enregistrer une sortie */
exports.sortie = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { sessionId } = req.params;

    // Vérifier la session active
    const check = await client.query(
      "SELECT s.*, ps.id AS spot_id FROM sessions s JOIN parking_spots ps ON s.spot_id=ps.id WHERE s.id=$1 AND s.status='active'",
      [sessionId]
    );
    if (!check.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Session active introuvable' });
    }

    const spotId = check.rows[0].spot_id;

    // Terminer la session (calcul montant en SQL)
    const updated = await SessionModel.complete(client, sessionId);

    // Libérer la place
    await client.query(
      "UPDATE parking_spots SET status='libre' WHERE id=$1",
      [spotId]
    );

    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('sortie:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

/* GET /api/sessions */
exports.getAll = async (req, res) => {
  try {
    const { status, floor, limit, offset } = req.query;
    const { rows } = await SessionModel.findAll({
      status, floor,
      userId:  req.user.id,
      isAdmin: req.user.role === 'admin',
      limit:   limit  ? parseInt(limit)  : 50,
      offset:  offset ? parseInt(offset) : 0,
    });
    res.json(rows);
  } catch (err) {
    console.error('sessions.getAll:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* GET /api/sessions/:id */
exports.getById = async (req, res) => {
  try {
    const { rows } = await SessionModel.findById(req.params.id);
    if (!rows.length) return res.status(404).json({ error: 'Session introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
