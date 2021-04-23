const express = require('express');
console.log('in logout');
router = express.Router();

logout = require('../Controllers/logout');

router.get('/logout', logout.logout);

module.exports = router