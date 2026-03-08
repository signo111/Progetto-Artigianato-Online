const { Client } = require('pg');

require("dotenv").config();

/*
// Configurazione PostgreSQL
const client = new Client({
  host: 'databaseartigianato1.cx2eimkaozun.eu-north-1.rds.amazonaws.com',
  user: 'postgres',
  password: '',
  database: 'DBArtigianato',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

*/

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// Ordini da inserire
const ordini = [
  { id_utente: 1, stato: 'completato', chiusura: '2024-04-01 10:00:00', totale: 150.00 },
  { id_utente: 2, stato: 'completato', chiusura: '2024-04-03 14:30:00', totale: 285.50 },
  { id_utente: 3, stato: 'completato', chiusura: '2024-04-05 09:15:00', totale: 99.99 },
  { id_utente: 4, stato: 'completato', chiusura: '2024-04-07 16:45:00', totale: 199.00 },
  { id_utente: 5, stato: 'completato', chiusura: '2024-04-09 12:00:00', totale: 345.75 },
  { id_utente: 6, stato: 'completato', chiusura: '2024-04-10 11:10:00', totale: 120.00 },
  { id_utente: 7, stato: 'completato', chiusura: '2024-04-11 17:45:00', totale: 80.50 },
  { id_utente: 1, stato: 'completato', chiusura: '2024-04-13 13:25:00', totale: 260.00 },
  { id_utente: 2, stato: 'completato', chiusura: '2024-04-14 08:50:00', totale: 305.25 },
  { id_utente: 3, stato: 'completato', chiusura: '2024-04-15 10:40:00', totale: 412.80 }
];

async function popolaOrdini() {
  try {
    await client.connect();
    console.log("Avvio inserimento ordini...");

    for (const o of ordini) {
      await client.query(
        `INSERT INTO ordine (id_utente, stato_ordine, chiusura_ordine, totale)
         VALUES ($1, $2, $3, $4)`,
        [o.id_utente, o.stato, o.chiusura, o.totale]
      );
      console.log(`Ordine inserito per utente ${o.id_utente} (${o.stato})`);
    }

    console.log("Inserimento ordini completato!");
  } catch (err) {
    console.error("Errore:", err);
  } finally {
    await client.end();
  }
}

popolaOrdini();
