// Importa i moduli necessari
// Importa il framework Express per creare il server web
const express = require("express");

// Crea un'istanza dell'app Express (il server)
const app = express();

// Importa il modulo CORS per permettere richieste cross-origin (da domini diversi)
const cors = require("cors");

// Usa CORS per abilitare richieste da qualsiasi origine
app.use(cors());

// Importa il client per connettersi al database (modulo personalizzato)
const { client } = require("./db");

// Importa bcrypt per la gestione sicura delle password (hashing)
const bcrypt = require("bcrypt");

// Importa Stripe per gestire pagamenti online e inizializza con la chiave API test
const stripe = require('stripe')('sk_test_51RTTSLFbljXrIje8zNiNi30WK064OWmPaUT4exuXiH2soQYraahkGExdLaBFvFFeSDUTJUBhqaecHABVziDZJiGx00lM6MNpdS');

// Importa multer, middleware per gestire upload di file (es. immagini)
const multer = require('multer');

// Permette a Express di leggere richieste con body in formato JSON
app.use(express.json());

// Permette a Express di leggere dati inviati tramite form HTML (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));

// Espone la cartella 'images' come statica, così i file al suo interno possono essere accessibili tramite URL
app.use('/images', express.static('images'));

// Importa il modulo 'path' per lavorare con i percorsi dei file in modo sicuro e indipendente dal sistema operativo
const path = require("path");

// Importa il modulo 'fs' (File System) per leggere, scrivere o modificare file sul disco
const fs = require('fs');

// Importa la variabile 'name' dal modulo 'ejs' (motore di template per generare HTML dinamico)
// (Nota: questa importazione non è comune, solitamente si importa tutto 'ejs' con const ejs = require("ejs"))
const { name } = require("ejs");

// Serve la cartella principale del progetto (la cartella padre rispetto a Backend)
app.use(express.static(path.join(__dirname, "..")));  // Serve tutti i file statici dalla root

// Serve index.html alla root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Funzione di test per stampare tutti gli utenti (solo per debug)
async function getData() {
  try {
    const res = await client.query("select * from utenti;");
    for (let i = 0; i < res.rows.length; i++) {
      console.log(res.rows[i].name);
    }
  } catch (err) {
    console.error("Errore nella query:", err);
  }
}
getData();

// Login utente
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body; // Serve per ottenere i dati inviati dal client 
  // (ad esempio da un form di login) nel body della richiesta HTTP POST
  console.log("Tentativo login:", username);
  try {
    const result = await client.query("SELECT * FROM utenti WHERE name = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Utente non trovato" });
    }
    const utente = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, utente.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Password errata" });
    }
    res.json({
      message: "Login effettuato con successo",
      ruolo: utente.ruolo,
      userId: utente.id  // Restituisce anche l'id utente
    });
  } catch (err) {
    console.error("Errore login:", err);
    res.status(500).json({ error: "Errore login" });
  }
});

// Registrazione utente
app.post("/api/register", async (req, res) => {
  const { username, email, password, ruolo } = req.body;
  console.log("Ricevuto:", username, email, ruolo);
  try {
    const existing = await client.query("SELECT * FROM utenti WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email già registrata" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await client.query(
      "INSERT INTO utenti (name, email, password, ruolo, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id",
      [username, email, hashed, ruolo]
    );
    const newUserId = result.rows[0].id;
    res.json({ message: "Registrazione completata", ruolo, id: newUserId });
  } catch (err) {
    console.error("Errore server:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

// Stripe checkout session
app.post("/create-checkout-session", async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Nessun prodotto nel carrello" });
  }
  // Prepara i prodotti per Stripe
  const line_items = items.map(item => ({
    price_data: {
      currency: "eur",
      product_data: { name: item.name },
      unit_amount: Math.round(Number(item.prezzo) * 100), // in centesimi
    },
    quantity: item.quantita || 1,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: "http://localhost:5500/success.html",
      cancel_url: "http://localhost:5500/cancel.html",
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("Errore Stripe:", error);
    res.status(500).json({ error: "Errore durante la creazione della sessione di pagamento" });
  }
});


// crea una checkout session per un singolo prodotto
// Questo endpoint è utile per pagamenti singoli, ad esempio per un prodotto specifico
app.post('/create-checkout-session-single', async (req, res) => {  // aggiungere
  const { name, price, quantity } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name },
          unit_amount: Math.round(price * 100), // prezzo in centesimi
        },
        quantity,
      }],
      mode: 'payment',
      success_url: 'http://localhost:5500/success.html',
      cancel_url: 'http://localhost:5500/cancel.html',
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Errore Stripe' });
  }
});


// Aggiungi prodotto al carrello
app.post("/api/add-to-cart", async (req, res) => {
  const { id_utente, id_prodotto, prezzo_totale, stato_carrello, quantita } = req.body;
  try {
    const existing = await client.query(
      "SELECT * FROM carrello WHERE id_utente = $1 AND id_prodotto = $2 AND stato_carrello = $3",
      [id_utente, id_prodotto, stato_carrello]
    );
    if (existing.rows.length > 0) {
      // Incrementa la quantità se già presente
      await client.query(
        "UPDATE carrello SET quantita = quantita + $1 WHERE id_utente = $2 AND id_prodotto = $3 AND stato_carrello = $4",
        [quantita, id_utente, id_prodotto, stato_carrello]
      );
    } else {
      // Inserisce nuovo prodotto nel carrello
      await client.query(
        "INSERT INTO carrello (id_utente, id_prodotto, prezzo_totale, stato_carrello, quantita) VALUES ($1, $2, $3, $4, $5)",
        [id_utente, id_prodotto, prezzo_totale, stato_carrello, quantita]
      );
    }
    res.json({ message: "Prodotto aggiunto/aggiornato nel carrello" });
  } catch (err) {
    console.error("Errore aggiunta carrello:", err);
    res.status(500).json({ error: "Errore inserimento carrello" });
  }
});

// Rimuovi prodotto dal carrello
app.delete("/api/remove-from-cart", async (req, res) => {
  const { userId, prodottoId } = req.body;
  try {
    await client.query(
      "DELETE FROM carrello WHERE id_utente = $1 AND id_prodotto = $2",
      [userId, prodottoId]
    );
    res.json({ message: "Prodotto rimosso dal carrello" });
  } catch (err) {
    console.error("Errore rimozione carrello:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

// Dati account utente
app.get("/api/account/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await client.query(
      "SELECT id, name, email, password, ruolo FROM utenti WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Errore recupero account:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

// Carrello utente (con JOIN prodotti)
app.get("/api/cart/:id_utente", async (req, res) => {
  const id_utente = req.params.id_utente;
  try {
    //AS quantita_disponibile significa che, nel risultato della query, questo 
    // campo si chiamerà quantita_disponibile invece di solo quantita
    const result = await client.query(
      `SELECT c.id_carrello, c.id_prodotto, c.prezzo_totale, c.stato_carrello, c.quantita, p.name, 
      p.immagine, p.prezzo, p.quantita AS quantita_disponibile
      FROM carrello c
      JOIN prodotti p ON c.id_prodotto = p.id
      WHERE c.id_utente = $1 AND c.stato_carrello = true`,
      [id_utente]
    );
    // Decodifica immagine se presente
    result.rows.forEach(row => {
      if (!row.immagine) {
        row.immagine = 'placeholder.png';
      }
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Errore recupero carrello:", err);
    res.status(500).json({ error: "Errore recupero carrello" });
  }
});

// Aggiorna quantità nel carrello
app.put("/api/update-cart-quantity", async (req, res) => {
  const { userId, prodottoId, quantity } = req.body;
  try {
    await client.query(
      "UPDATE carrello SET quantita = $1 WHERE id_utente = $2 AND id_prodotto = $3",
      [quantity, userId, prodottoId]
    );
    res.json({ message: "Quantità aggiornata" });
  } catch (err) {
    console.error("Errore update quantity:", err);
    res.status(500).json({ error: "Errore aggiornamento quantità" });
  }
});

// Restituisce tutti i prodotti

app.get('/api/prodotti', async (req, res) => {
  try {
    const result = await client.query(
      'SELECT prodotti.id, prezzo, descrizione, disponibilita, prodotti.immagine, quantita, id_utente, prodotti.created_at, utenti.name AS artigiano_name , prodotti.name AS prodotto_name FROM prodotti inner join utenti on prodotti.id_utente= utenti.id'
    );
 
    res.json(result.rows);
  } catch (err) {
    console.error("Errore query prodotti:", err);
    res.status(500).json({ error: 'Errore nella query SQL' });
  }
});

// Completa ordine: crea un ordine e svuota il carrello
app.post("/api/complete-order", async (req, res) => {
  const { userId } = req.body;
  try {
    // Prendi tutti i prodotti nel carrello dell'utente
    const carrello = await client.query(
      "SELECT * FROM carrello WHERE id_utente = $1 AND stato_carrello = true",
      [userId]
    );
    // Calcola il totale dell'ordine
    let totale = 0;
    carrello.rows.forEach(item => {
      totale += Number(item.quantita) * Number(item.prezzo_totale);
    });


    // Aggiorna la quantità disponibile dei prodotti
    // Ciclo su tutti gli elementi dentro carrello.rows
    for (const item of carrello.rows) { // aggiungere

      // Per ogni item (oggetto con almeno item.quantita e item.id_prodotto)
      // eseguo una query SQL sul database PostgreSQL.
      // Uso await perché client.query() restituisce una Promise (operazione asincrona).
      await client.query(
        // Query SQL:
        // "Aggiorna la tabella prodotti, sottraendo la quantità dell'item dal campo quantita
        // solo per il prodotto con id corrispondente"
        "UPDATE prodotti SET quantita = quantita - $1 WHERE id = $2",

        // Parametri da passare alla query:
        // $1 → item.quantita (quanto sottrarre)
        // $2 → item.id_prodotto (quale riga aggiornare)
        [item.quantita, item.id_prodotto]
      );

    }

    // Imposta disponibilita = false per i prodotti esauriti
    await client.query(
      "UPDATE prodotti SET disponibilita = false WHERE quantita = 0"
    );

    // Crea un solo ordine con il totale
    await client.query(
      "INSERT INTO ordine (id_utente, totale, stato_ordine, chiusura_ordine) VALUES ($1, $2, $3, NOW())",
      [userId, totale, 'completato']
    );
    // Svuota il carrello dell'utente
    await client.query(
      "DELETE FROM carrello WHERE id_utente = $1 AND stato_carrello = true",
      [userId]
    );
    res.json({ message: "Ordine completato e carrello svuotato" });
  } catch (err) {
    console.error("Errore completamento ordine:", err);
    res.status(500).json({ error: "Errore completamento ordine" });
  }
});

// Restituisce tutti gli ordini dell'utente se non si è loggati come amministratore altrimenti stampa tutti gli ordini 
app.get('/api/orders/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`➡️ Richiesta ordini per userId: ${userId}`);
  try {
    // 1. Recupera il ruolo dell'utente
    const ruoloResult = await client.query(
      'SELECT ruolo FROM utenti WHERE id = $1',
      [userId]
    );
    console.log("📄 Risultato query ruolo:", ruoloResult.rows);
    if (ruoloResult.rows.length === 0) {
      console.warn("⚠️ Utente non trovato");
      return res.status(404).json({ error: "Utente non trovato" });
    }
    const ruolo = ruoloResult.rows[0].ruolo;
    console.log(`👤 Ruolo utente: ${ruolo}`);
    // 2. Se è amministratore, prendi tutti gli ordini
    let orders;
    if (ruolo === 'amministratore') {
      console.log("🔓 Accesso come amministratore: recupero tutti gli ordini");
      orders = await client.query('SELECT * FROM ordine');
    } else {
      console.log("🔒 Accesso come utente normale: recupero ordini personali");
      orders = await client.query(
        'SELECT * FROM ordine WHERE id_utente = $1',
        [userId]
      );
    }
    console.log(`📦 Numero ordini trovati: ${orders.rows.length}`);
    res.json(orders.rows);
  } catch (err) {
    console.error("❌ Errore recupero ordini:", err);
    res.status(500).json({ error: "Errore recupero ordini" });
  }
});



// Inserimento prodotto (endpoint alternativo)
app.post('/api/insert-product', async (req, res) => {
  const { userId, name, prezzo, descrizione, disponibilita, immagine, quantita } = req.body;
  if (!userId || !name || !prezzo) {
    return res.status(400).json({ error: "Campi obbligatori mancanti" });
  }
  try {
    await client.query(
      `INSERT INTO prodotti 
       (id_utente, name, prezzo, descrizione, disponibilita, immagine, quantita) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, name, prezzo, descrizione, disponibilita, immagine, quantita]
    );
    res.json({ message: "Prodotto inserito correttamente" });
  } catch (err) {
    console.error("Errore inserimento prodotto:", err);
    res.status(500).json({ error: "Errore server durante inserimento prodotto" });
  }
});

// Multer per il caricamento immagini
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "images/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage });

// Serve file statici e immagini
app.use(express.static("public"));
app.use("/images", express.static("images"));

// Inserimento prodotto con immagine (endpoint alternativo)
app.post("/api/prodotti", upload.single("immagine"), (req, res) => {
  const { nome, descrizione, prezzo, quantita, id_utente } = req.body;
  const disponibilita = quantita > 0;
  const immagine = req.file ? req.file.filename : null;
  if (!id_utente) {
    return res.status(400).json({ message: "ID utente mancante." });
  }
  // Costruisce la query SQL per inserire un nuovo prodotto nel database.
  // I valori ($1, $2, ...) sono segnaposto che verranno sostituiti con i dati reali forniti dall'utente.
  const sql = `
    INSERT INTO prodotti (name, descrizione, prezzo, quantita, id_utente, immagine, disponibilita)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`;
    // Esegue la query di inserimento nel database PostgreSQL.
    // Il secondo parametro è un array con i valori da inserire nei segnaposto della query.
    // La funzione di callback gestisce il risultato o eventuali errori.
    client.query(
      sql, // La query SQL da eseguire
      [nome, descrizione, prezzo, quantita, id_utente, immagine, disponibilita], // Valori da inserire
      (err, result) => {
        if (err) {
          // Se c'è un errore nell'inserimento (es: vincoli violati), stampa l'errore e risponde con errore 500
          console.error("Errore DB:", err);
          return res.status(500).json({ message: "Errore durante l'inserimento." });
        }
        // Se l'inserimento va a buon fine, restituisce un messaggio di successo e l'id del nuovo prodotto
        res.status(201).json({ message: "Prodotto inserito!", id: result.rows[0]?.id });
  });
});

// Riallinea la sequenza degli ID prodotti
client.query(`SELECT setval('prodotti_id_seq', (SELECT MAX(id) FROM prodotti))`, (err) => {
  if (err) {
    console.error("❌ Errore nel riallineare la sequenza prodotti_id_seq:", err);
  } else {
    console.log("✅ Sequenza prodotti_id_seq riallineata con l'ID massimo corrente.");
  }
});

// Modifica prodotto
app.post("/api/modifica-prodotto", upload.single("immagine"), (req, res) => {
  const { name, prezzo, descrizione, quantita, userId } = req.body;
  const disponibilita = quantita && quantita > 0;
  const immagine = req.file ? req.file.filename : null;
  if (!userId || !name) {
    return res.status(400).json({ message: "Campi obbligatori mancanti (userId o name)" });
  }
  const check = `SELECT * FROM prodotti WHERE name = $1 AND id_utente = $2`;
  client.query(check, [name, userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Errore DB nella verifica" });
    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Prodotto non trovato o non tuo" });
    }
    // Costruisci dinamicamente i campi da aggiornare
    const fields = [];
    const values = [];
    let i = 1;
    if (prezzo) {
      fields.push(`prezzo = $${i++}`);
      values.push(prezzo);
    }
    if (descrizione) {
      fields.push(`descrizione = $${i++}`);
      values.push(descrizione);
    }
    if (quantita) {
      fields.push(`quantita = $${i++}`);
      values.push(quantita);
      fields.push(`disponibilita = $${i++}`);
      values.push(disponibilita);
    }
    if (immagine) {
      fields.push(`immagine = $${i++}`);
      values.push(immagine);
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: "Nessun campo da aggiornare" });
    }
    // Completa la query
    const updateQuery = `
      UPDATE prodotti SET ${fields.join(", ")}
      WHERE name = $${i++} AND id_utente = $${i}
    `;
    values.push(name, userId);
    if (immagine) {
  const vecchiaImmagine = results.rows[0].immagine;
  const pathVecchia = path.join(__dirname, 'images', vecchiaImmagine.toString('utf8'));
  if (fs.existsSync(pathVecchia)) {
    fs.unlinkSync(pathVecchia);
  }
}
    client.query(updateQuery, values, (updateErr) => {
      if (updateErr) {
        console.error("Errore update:", updateErr);
        return res.status(500).json({ message: "Errore durante aggiornamento" });
      }
      res.json({ message: "Prodotto aggiornato con successo" });
    });
  });
});

// Modifica profilo utente
app.post("/api/modifica-account", async (req, res) => {
  const { userId, username, email, password } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "ID utente mancante" });
  }
  try {
    // Verifica che esista
    const check = await client.query("SELECT * FROM utenti WHERE id = $1", [userId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    // Costruiamo solo i campi presenti
    const fields = [];
    const values = [];
    let i = 1;
    if (username) {
      fields.push(`name = $${i++}`);
      values.push(username);
    }
    if (email) {
      fields.push(`email = $${i++}`);
      values.push(email);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password = $${i++}`);
      values.push(hashed);
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: "Nessun campo da aggiornare" });
    }
    const updateQuery = `
      UPDATE utenti SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING id
    `;
    values.push(userId);
    const result = await client.query(updateQuery, values);
    res.json({ message: "Account aggiornato con successo", id: result.rows[0].id });
  } catch (err) {
    console.error("Errore durante aggiornamento account:", err);
    res.status(500).json({ message: "Errore server" });
  }
});
app.delete('/api/utenti/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const result = await client.query('DELETE FROM utenti WHERE id = $1', [userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }
        res.json({ message: 'Utente eliminato con successo' });
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});


app.put('/api/utenti/:id', async(req, res) => {
  const { id } = req.params;
  const { ruolo, password } = req.body;
  // Se viene fornita anche la password, aggiorna entrambi
  if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10); // 👈 await ora è valido!
    client.query(
      'UPDATE utenti SET ruolo = $1, password = $2 WHERE id = $3',
      [ruolo, hashedPassword, id],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Errore aggiornamento dati' });
        res.json({ message: 'Dati aggiornati con successo' });
      }
    );
  } else {
    // Altrimenti aggiorna solo il ruolo
    client.query(
      'UPDATE utenti SET ruolo = $1 WHERE id = $2',
      [ruolo, id],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Errore aggiornamento ruolo' });
        res.json({ message: 'Ruolo aggiornato con successo' });
      }
    );
  }
});

app.get('/api/utenti', (req, res) => {
  client.query(
  'SELECT id, name, email, ruolo FROM utenti WHERE name != $1',
  ['Admin'],
 (err, result) => {
    if (err) return res.status(500).json({ error: 'Errore nel caricamento utenti' });
    res.json(result.rows);
  });
});

// Recupera tutti i prodotti
/*app.get('/api/prodotti', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM prodotti');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel caricamento dei prodotti' });
  }
});*/

// Aggiorna un prodotto
// ROUTE MODIFICATA: accetta upload + dati
app.put('/api/prodotti/:id', upload.single('immagine'), async (req, res) => {
  const { id } = req.params;
  const { name, descrizione, prezzo, quantita, disponibilita, immaginePrecedente } = req.body;
  try {
    // 🧱 se c'è un nuovo file, gestiscilo
    let nomeFinale = immaginePrecedente;
    if (req.file) {
      nomeFinale = req.file.filename;
      // 🧹 elimina immagine precedente se presente
      const pathPrecedente = path.join(__dirname, 'images', immaginePrecedente);
      if (fs.existsSync(pathPrecedente)) {
        fs.unlinkSync(pathPrecedente);
      }
    }
    const immagineHex = Buffer.from(nomeFinale, 'utf8').toString('hex');
    await client.query(
      `UPDATE prodotti 
       SET name = $1, immagine = $2, descrizione = $3, prezzo = $4, quantita = $5, disponibilita = $6 
       WHERE id = $7`,
      [name, '\\x' + immagineHex, descrizione, prezzo, quantita, disponibilita, id]
    );
    res.json({ message: 'Prodotto aggiornato con successo' });
  } catch (err) {
    console.error('Errore aggiornamento prodotto:', err);
    res.status(500).json({ error: 'Errore aggiornamento' });
  }
});

// Elimina un prodotto
app.delete('/api/prodotti/:id', async (req, res) => {
  try {
    await client.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]);
    res.json({ message: 'Prodotto eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: 'Errore durante eliminazione' });
  }
});
// Avvia il server sulla porta 3000
app.listen(3000, () => {
  console.log("port connected");
});