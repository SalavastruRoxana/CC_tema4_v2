const express = require('express');

router = express.Router();

maps = require('../Controllers/maps');

router.get('/maps', maps.maps);

module.exports = router