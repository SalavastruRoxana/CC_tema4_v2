const express = require('express');

router = express.Router();

register = require('../Controllers/register');
router.route('/')
    .get(register.register)
    .post((req, res) => {
        const firstname = req.body.firstname
        const lastname = req.body.lastname
        const email = req.body.email
        const password = req.body.password
        const registerDB = require('../Models/SQLAzure')
        registerDB.register(email, firstname, lastname, password)
        res.render('home_long', { email: email })
    });
module.exports = router