const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  try {
    console.log('Register body:', req.body);
    const first_name = req.body.first_name || req.body.prenom || '';
    const last_name  = req.body.last_name  || req.body.nom   || '';
    const email      = req.body.email      || '';
    const password   = req.body.password   || '';
    const phone      = req.body.phone || req.body.telephone || null;

    if (!first_name || !last_name || !email || !password)
      return res.status(400).json({ error: 'Champs obligatoires manquants' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum' });

    const exists = await UserModel.findByEmail(email);
    if (exists.rows.length)
      return res.status(409).json({ error: 'Email déjà utilisé' });

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await UserModel.create({ first_name, last_name, email, phone, password_hash });

    const token = signToken(rows[0].id);
    res.status(201).json({ user: rows[0], token });
  } catch (err) {
    console.error('register:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email et mot de passe requis' });

    const { rows } = await UserModel.findByEmail(email);
    if (!rows.length)
      return res.status(401).json({ error: 'Identifiants invalides' });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Identifiants invalides' });

    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('login:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const { rows } = await UserModel.findById(req.user.id);
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};