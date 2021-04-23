const express = require('express');
app = express();

app.use(express.urlencoded({ extended: false }));

require('dotenv').config();
app.set('view engine', 'ejs');

var currentUser = []
const msal = require('@azure/msal-node');

app.use('/home', require('./Routes/home'));
app.use('/logout', require('./Routes/logout'));
const config = {
    auth: {
        clientId: "3f89bf79-f08d-4a61-879f-99d0349ffe3c",
        authority: "https://login.microsoftonline.com/9a12f85d-6362-44ac-9aad-a63623517d97",
        clientSecret: "F1zvzIMdmTS.xi9UMN_~M.G5OIzuVCg7.1"
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        }
    }
};

// Create msal application object
const cca = new msal.ConfidentialClientApplication(config);

app.get('/', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: "http://localhost:3000/redirect",
    };

    // get url to sign user in and consent to scopes needed for application
    cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
        res.redirect(response);
    }).catch((error) => console.log(JSON.stringify(error)));
});

app.get('/redirect', (req, res) => {
    const tokenRequest = {
        code: req.query.code,
        scopes: ["user.read"],
        redirectUri: "http://localhost:3000/redirect",
    };

    cca.acquireTokenByCode(tokenRequest).then((response) => {
        console.log("\nResponse: \n", response.idTokenClaims.preferred_username, "\n", response.idTokenClaims);
        currentUser = {
            email: response.idTokenClaims.preferred_username,
            name: response.idTokenClaims.name
        }
        const registerDB = require('./Models/SQLAzure')
        registerDB.registerMicrosoft(response.idTokenClaims.preferred_username, response.idTokenClaims.name)
        res.status(200)
            .redirect('/maps');
    }).catch((error) => {
        console.log(error);
        res.status(500).send(error);
    });
});

app.use('/', require('./Routes/videos'));
app.use('/', require('./Routes/maps'));
const register = require('./Routes/register')
app.use('/register', register);


const PORT = process.env.PORT || 3000;



app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});