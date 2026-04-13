const SpotModel = require('../models/spotModel');

/* GET /api/spots */
exports.getAll = async (req, res) => {
  try {
    const { floor, status } = req.query;
    const { rows } = await SpotModel.findAll({ floor, status });
    res.json(rows);
  } catch (err) {
    console.error('spots.getAll:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* GET /api/spots/summary */
exports.summary = async (req, res) => {
  try {
    const [floors, total] = await Promise.all([
      SpotModel.summary(),
      SpotModel.totalSummary(),
    ]);
    res.json({ floors: floors.rows, total: total.rows[0] });
  } catch (err) {
    console.error('spots.summary:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* PUT /api/spots/:id  (admin) */
exports.update = async (req, res) => {
  try {
    const { status, spot_type } = req.body;
    const { rows } = await SpotModel.update(req.params.id, { status, spot_type });
    res.json(rows[0]);
  } catch (err) {
    console.error('spots.update:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
