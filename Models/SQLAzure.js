const { response } = require("express");
const { Connection, Request } = require("tedious");
const ConnectionPool = require("tedious-connection-pool");

var poolConfig = {
    min: 1,
    max: 20,
    log: true,
};


// Create connection to database
const config = {
    userName: "admin1234", // update me
    password: "Roxana1999", // update me
    server: "tema-v1.database.windows.net", // update me
    options: {
        port: 1433,
        database: "tema-v1", //update me
        rowCollectionOnRequestCompletion: true,
        encrypt: true
    }
};

const pool = new ConnectionPool(poolConfig, config);


exports.register = (email, firstname, lastname, password) => {

    pool.acquire((err, connection) => {
        if (err) {
            console.log(err);
            console.log(err.message);
            response.status(500);
        }
        const sql = `INSERT INTO Users(email, lastName, firstName, password) VALUES ( '${email}', '${lastname}', '${firstname}','${password}')`;

        const request = new Request(sql, (err, rowCount, rows) => {
            if (err) {
                console.error('Boards query err', err);
                //response.status(500).send({ error: "Server error" });
            } else {
                if (rowCount == 0) {
                    res.status(404).send({
                        error: "nothing found"
                    });
                    return;
                }
                console.log("request executed: rows:", rowCount, rows);
                const row = rows[0];
                connection.release();
            }
        });
        connection.execSql(request);
    });
}

exports.registerMicrosoft = (email, name) => {

    pool.acquire((err, connection) => {
        if (err) {
            console.log(err);
            console.log(err.message);
            response.status(500);
        }
        const sql = `INSERT INTO MicrosoftUsers(email, name) VALUES ( '${email}', '${name}')`;

        const request = new Request(sql, (err, rowCount, rows) => {
            if (err) {
                console.error('Boards query err', err);
            } else {
                if (rowCount == 0) {
                    res.status(404).send({
                        error: "nothing found"
                    });
                    return;
                }
                console.log("request executed: rows:", rowCount, rows);
                const row = rows[0];
                connection.release();
            }
        });
        connection.execSql(request);
    });
}