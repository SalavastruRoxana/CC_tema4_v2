const express = require('express');

router = express.Router();

login = require('../Controllers/login');
router.get('/login', login.login);
router.get('/', login.login);

router.post('/login', (req, res) => {

})

module.exports = router