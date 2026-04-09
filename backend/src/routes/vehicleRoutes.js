const express = require('express');
const { getVehicles, addVehicle } = require('../controllers/vehicleController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, getVehicles);
router.post('/', auth, addVehicle);

module.exports = router;