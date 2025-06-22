const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { name } = require('ejs');

// Percorso immagine utente di default
const defaultImagePath = path.join(__dirname, '../images/user_image1.png');
const defaultImageBuffer = fs.readFileSync(defaultImagePath);

// Lista utenti completa (30)
const utenti = [
  { name: 'Anna Bianchi', email: 'anna.bianchi@example.com', password: 'cliente123', ruolo: 'cliente' },
  { name: 'Falegnameria Verdi', email: 'luca.verdi@example.com', password: 'artigiano456', ruolo: 'artigiano' },
  { name: 'Chiara Neri', email: 'chiara.neri@example.com', password: 'cliente456', ruolo: 'cliente' },
  { name: 'Rizzo Legnami', email: 'marco.rizzo@example.com', password: 'woodwork2024', ruolo: 'artigiano' },
  { name: 'Elisa Gallo', email: 'elisa.gallo@example.com', password: 'elisa789', ruolo: 'cliente' },
  { name: 'Serramenti De Luca', email: 'fabio.deluca@example.com', password: 'fabioPower!', ruolo: 'artigiano' },
  { name: 'Giulia Serra', email: 'giulia.serra@example.com', password: 'serraSecure1', ruolo: 'cliente' },
  { name: 'Officina Conti', email: 'davide.conti@example.com', password: 'contiFabbro$', ruolo: 'artigiano' },
  { name: 'Martina Bruno', email: 'martina.bruno@example.com', password: 'bruno1234', ruolo: 'cliente' },
  { name: 'Elettrotecnica Greco', email: 'simone.greco@example.com', password: 'grecoFixIt', ruolo: 'artigiano' },
  { name: 'Sara Moretti', email: 'sara.moretti@example.com', password: 'moretti777', ruolo: 'cliente' },
  { name: 'Impianti Longo', email: 'matteo.longo@example.com', password: 'mLongo!', ruolo: 'artigiano' },
  { name: 'Alessia Costa', email: 'alessia.costa@example.com', password: 'aleC123', ruolo: 'cliente' },
  { name: 'Leone Restauri', email: 'tommaso.leone@example.com', password: 'leone2025', ruolo: 'artigiano' },
  { name: 'Irene Fabbri', email: 'irene.fabbri@example.com', password: 'ifabbri$', ruolo: 'cliente' },
  { name: 'Orlando Costruzioni', email: 'giorgio.orlando@example.com', password: 'orlandoFixer', ruolo: 'artigiano' },
  { name: 'Francesca Ferri', email: 'francesca.ferri@example.com', password: 'franci@1', ruolo: 'cliente' },
  { name: 'Sala Tinteggiature', email: 'stefano.sala@example.com', password: 'salaSecure88', ruolo: 'artigiano' },
  { name: 'Valentina Pini', email: 'valentina.pini@example.com', password: 'vpini456', ruolo: 'cliente' },
  { name: 'Grassi Impianti Elettrici', email: 'nicola.grassi@example.com', password: 'grassiElec@', ruolo: 'artigiano' },
  { name: 'Andrea Riva', email: 'andrea.riva@example.com', password: 'riva123', ruolo: 'cliente' },
  { name: 'Carpenteria Rossi', email: 'carp.rossi@example.com', password: 'rossiSecure!', ruolo: 'artigiano' },
  { name: 'Lucia Fontana', email: 'lucia.fontana@example.com', password: 'fontanaCiao1', ruolo: 'cliente' },
  { name: 'Marmo e Design', email: 'marmodesign@example.com', password: 'marmoArt!', ruolo: 'artigiano' },
  { name: 'Stefano De Angelis', email: 'stefano.da@example.com', password: 'angeliSafe', ruolo: 'cliente' },
  { name: 'EdilColor', email: 'info@edilcolor.com', password: 'edilColoR$', ruolo: 'artigiano' },
  { name: 'Roberta Parisi', email: 'roberta.parisi@example.com', password: 'parisiPass', ruolo: 'cliente' },
  { name: 'Tecnoimpianti SRL', email: 'tecnoimpianti@example.com', password: 'tecnoSecure7', ruolo: 'artigiano' },
  { name: 'Paola Grechi', email: 'paola.grechi@example.com', password: 'grechiPaola9!', ruolo: 'cliente' },
  { name: 'Idraulica Milani', email: 'milani.idraulica@example.com', password: 'milaniH2O', ruolo: 'artigiano' },
  {name:'admin', email:'admin@example.com', password: 'AdminSicuro2025!', ruolo: 'amministratore'}
];

// Configurazione PostgreSQL
const client = new Client({
  host: 'databaseartigianato1.cx2eimkaozun.eu-north-1.rds.amazonaws.com',
  user: 'postgres',
  password: 'PasDB2025!',
  database: 'DBArtigianato',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});
async function popolaDatabase() {
  try {
    await client.connect();
    console.log("▶ Avvio popolamento...");
    for (const u of utenti) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await client.query(
        'INSERT INTO utenti (name, email, password, ruolo, immagine) VALUES ($1, $2, $3, $4, $5)',
        [u.name, u.email, hashedPassword, u.ruolo, defaultImageBuffer]
      );
      console.log(`✅ Inserito ${u.name}`);
    }
    console.log("🎉 Popolamento completato!");
  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    await client.end();
  }
}
popolaDatabase();
