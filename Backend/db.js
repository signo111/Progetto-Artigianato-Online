const { Client } = require("pg");

const client = new Client({
  host: "databaseartigianato1.cx2eimkaozun.eu-north-1.rds.amazonaws.com",
  user: "postgres",
  database: "DBArtigianato",
  password: "PasDB2025!",
  port: 5432,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => { console.log("connected to pg"); })
  .catch((err) => {
    console.log("can't connect to pg");
    console.error(err); // Stampa l'errore dettagliato
  });

module.exports = { client };


