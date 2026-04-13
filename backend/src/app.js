const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

/* ── Middleware ── */
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Routes ── */
app.use('/api', require('./routes'));

/* ── Health ── */
app.get('/health', (_req, res) => res.json({ status: 'OK', time: new Date() }));

/* ── 404 ── */
app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }));

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

module.exports = app;
