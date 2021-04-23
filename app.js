const express = require('express');
app = express();

app.use(express.urlencoded({ extended: false }));

require('dotenv').config();
app.set('view engine', 'ejs');

const currentUser = []

app.use('/home', require('./Routes/home'));
app.use('/', require('./Routes/login'));
app.use('/', require('./Routes/videos'));
app.use('/', require('./Routes/maps'));
const register = require('./Routes/register')
app.use('/register', register);


const PORT = process.env.PORT || 3000;



app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});