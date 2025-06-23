const { Client } = require('pg');

// Configurazione PostgreSQL
const client = new Client({
  host: 'databaseartigianato1.cx2eimkaozun.eu-north-1.rds.amazonaws.com',
  user: 'postgres',
  password: 'PasDB2025!',
  database: 'DBArtigianato',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Ordini da inserire
const ordini = [
  { id_utente: 83, stato: 'completato', chiusura: '2024-04-01 10:00:00', totale: 150.00 },
  { id_utente: 84, stato: 'completato', chiusura: '2024-04-03 14:30:00', totale: 285.50 },
  { id_utente: 87, stato: 'completato', chiusura: '2024-04-05 09:15:00', totale: 99.99 },
  { id_utente: 88, stato: 'completato', chiusura: '2024-04-07 16:45:00', totale: 199.00 },
  { id_utente: 101, stato: 'completato', chiusura: '2024-04-09 12:00:00', totale: 345.75 },
  { id_utente: 91, stato: 'completato', chiusura: '2024-04-10 11:10:00', totale: 120.00 },
  { id_utente: 95, stato: 'completato', chiusura: '2024-04-11 17:45:00', totale: 80.50 },
  { id_utente: 83, stato: 'completato', chiusura: '2024-04-13 13:25:00', totale: 260.00 },
  { id_utente: 84, stato: 'completato', chiusura: '2024-04-14 08:50:00', totale: 305.25 },
  { id_utente: 87, stato: 'completato', chiusura: '2024-04-15 10:40:00', totale: 412.80 }
];

async function popolaOrdini() {
  try {
    await client.connect();
    console.log("▶ Avvio inserimento ordini...");

    for (const o of ordini) {
      await client.query(
        `INSERT INTO ordine (id_utente, stato_ordine, chiusura_ordine, totale)
         VALUES ($1, $2, $3, $4)`,
        [o.id_utente, o.stato, o.chiusura, o.totale]
      );
      console.log(`✅ Ordine inserito per utente ${o.id_utente} (${o.stato})`);
    }

    console.log("🎉 Inserimento ordini completato!");
  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    await client.end();
  }
}

popolaOrdini();
