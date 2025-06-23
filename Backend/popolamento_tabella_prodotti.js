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

// Lista prodotti predefiniti
const prodotti = [
  { name: 'Tavolo Rustico', immagine: 'tavolo_legno.jpg', descrizione: 'Tavolo artigianale in legno massello con gambe in ferro incrociate', prezzo: 420.00, quantita: 3, id_utente: 83 },
  {  name: 'Lampada Moderna', immagine: 'lampada_ferro.jpg', descrizione: 'Lampada da tavolo in ferro battuto e legno massello, design moderno', prezzo: 135.50, quantita: 1, id_utente: 91 },
  { name: 'Scaffale Loft', immagine: 'scaffale_industrial.jpg', descrizione: 'Scaffale industriale in ferro battuto e legno di abete', prezzo: 299.99, quantita: 0, id_utente: 97},
  { name: 'Libreria Vintage', immagine: 'libreria_vintage.jpg', descrizione: 'Libreria artigianale anni 70 in ferro battuto e legno', prezzo: 380.00, quantita: 2, id_utente: 109 },
  {  name: 'Specchio Artigianale',immagine: 'specchio_ferro.jpg', descrizione: 'Specchio decorativo con cornice in ferro battuto', prezzo: 89.90, quantita: 5, id_utente: 99 },
  { name: 'Mobile TV Castagno', immagine: 'mobile_tv.jpg', descrizione: 'Mobile TV su misura in legno di castagno e struttura in ferro', prezzo: 510.00, quantita: 1, id_utente: 109 },
  {  name: 'Lampadario Rustico',immagine: 'lampadario_legno.jpg', descrizione: 'Lampadario rustico in ferro battuto con dettagli in legno e ceramica', prezzo: 210.00, quantita: 0, id_utente: 101 },
  { name: 'Finestra Decorata', immagine: 'finestra_grata.jpg', descrizione: 'Finestra in legno con grata in ferro battuto intagliata a giglio', prezzo: 320.00, quantita: 4, id_utente: 87 },
  {  name: 'Tavolo Castagno',immagine: 'tavolo_castagno.jpg', descrizione: 'Tavolo in legno massello di castagno italiano', prezzo: 460.00, quantita: 2, id_utente: 83 },
  {  name: 'Applique in Ferro',immagine: 'applique_rustica.jpg', descrizione: 'Applique rustica in ferro battuto e legno con vetro ceramico', prezzo: 115.00, quantita: 0, id_utente: 101 }
];

async function popolaProdotti() {
  try {
    await client.connect();
    console.log("▶ Avvio inserimento prodotti...");

    for (const p of prodotti) {
      const disponibilita = p.quantita > 0;
      await client.query(
        `INSERT INTO prodotti (immagine, descrizione, prezzo, quantita, disponibilita, id_utente)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.immagine, p.descrizione, p.prezzo, p.quantita, disponibilita, p.id_utente]
      );
      console.log(`✅ Inserito: ${p.descrizione}`);
    }

    console.log("🎉 Inserimento completato!");
  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    await client.end();
  }
}

popolaProdotti();
