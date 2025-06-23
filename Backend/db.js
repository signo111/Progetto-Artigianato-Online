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
  .then(async () => { 
    console.log("connected to pg"); 
    await client.query("SET TIME ZONE 'Europe/Rome'"); // <-- aggiungi qui
    console.log("Fuso orario impostato su Europe/Rome");

  })
  .catch((err) => {
    console.log("can't connect to pg");
    console.error(err); // Stampa l'errore dettagliato
  });

module.exports = { client };


