const express = require('express');

router = express.Router();

home = require('../Controllers/home');

router.get('/home', home.home);

module.exports = router