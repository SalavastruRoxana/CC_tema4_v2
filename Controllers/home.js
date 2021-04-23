exports.home = (req, res) => {
    const helperfunc = require('./homehelper.js');
    //console.log(typeof helperfunc.GetMap)
    //res.render('home', { _: helperfunc });
    res.render('home_long');
}