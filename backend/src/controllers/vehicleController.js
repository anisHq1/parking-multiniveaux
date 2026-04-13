const VehicleModel = require('../models/vehicleModel');

exports.create = async (req, res) => {
  try {
    console.log('Body reçu:', req.body);
    const plate = (req.body.plate || req.body.license_plate || '').toString().trim();
    const model = req.body.model || '';
    const color = req.body.color || '';

    if (!plate || !model || !color)
      return res.status(400).json({ error: 'plate, model et color sont requis' });

    const dup = await VehicleModel.findByPlate(plate);
    if (dup.rows.length)
      return res.status(409).json({ error: 'Plaque déjà enregistrée' });

    const { rows } = await VehicleModel.create({
      user_id: req.user.id,
      plate,
      model,
      color,
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('vehicle.create:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = isAdmin
      ? await VehicleModel.findAllAdmin()
      : await VehicleModel.findByUser(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error('vehicle.getAll:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { rows } = await VehicleModel.findByUser(req.user.id);
    const v = rows.find(x => x.id === parseInt(req.params.id));
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  try {
    const { rows } = await VehicleModel.update(req.params.id, req.user.id, req.body);
    if (!rows.length)
      return res.status(404).json({ error: 'Véhicule introuvable ou non autorisé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('vehicle.update:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.remove = async (req, res) => {
  try {
    await VehicleModel.delete(req.params.id, req.user.id);
    res.json({ message: 'Véhicule supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};