const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');

const auth      = require('../controllers/authController');
const vehicle   = require('../controllers/vehicleController');
const spot      = require('../controllers/spotController');
const session   = require('../controllers/sessionController');
const reserve   = require('../controllers/reserveController');
const dashboard = require('../controllers/dashboardController');

/* ── Auth ──────────────────────────────────── */
router.post('/register', auth.register);
router.post('/login',    auth.login);
router.get( '/me',       protect, auth.getMe);

/* ── Vehicles ──────────────────────────────── */
router.post(  '/vehicles',     protect, vehicle.create);
router.get(   '/vehicles',     protect, vehicle.getAll);
router.get(   '/vehicles/:id', protect, vehicle.getById);
router.put(   '/vehicles/:id', protect, vehicle.update);
router.delete('/vehicles/:id', protect, vehicle.remove);

/* ── Spots ─────────────────────────────────── */
router.get('/spots',          spot.getAll);
router.get('/spots/summary', protect, spot.summary);
router.put('/spots/:id',     protect, adminOnly, spot.update);

/* ── Sessions (entry / sortie) ─────────────── */
router.post('/entry',              protect, session.entry);
router.post('/sortie/:sessionId',  protect, session.sortie);
router.get( '/sessions',           protect, session.getAll);
router.get( '/sessions/:id',       protect, session.getById);

/* ── Reservations ──────────────────────────── */
router.post(  '/reserve',     protect, reserve.create);
router.get(   '/reserve',     protect, reserve.getAll);
router.delete('/reserve/:id', protect, reserve.cancel);

/* ── Dashboard ─────────────────────────────── */
router.get('/dashboard', protect, dashboard.get);
const request = require('../controllers/requestController')

router.get('/rates',                    request.getRates)
router.post('/requests',                request.create)
router.get('/requests/:id/status',      request.getStatus)
router.get('/requests',    protect,     request.getAll)
router.post('/requests/:id/approve', protect, adminOnly, request.approve)
router.post('/requests/:id/reject',  protect, adminOnly, request.reject)

module.exports = router;
