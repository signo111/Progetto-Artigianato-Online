// Importa i moduli necessari
// Importa il framework Express per creare il server web
const express = require("express"); // Carica il modulo Express dal node_modules

// Crea un'istanza dell'app Express (il server)
const app = express(); // Istanza principale dell'applicazione Express

// Importa il modulo CORS per permettere richieste cross-origin (da domini diversi)
const cors = require("cors"); // Carica il modulo CORS

// Usa CORS per abilitare richieste da qualsiasi origine
app.use(cors()); // Applica il middleware CORS a tutte le route

// Importa il client per connettersi al database (modulo personalizzato)
const { client } = require("./db"); // Importa il client PostgreSQL dal file db.js locale

require("dotenv").config(); // Carica le variabili d'ambiente dal file .env

// Importa bcrypt per la gestione sicura delle password (hashing)
const bcrypt = require("bcrypt"); // Carica il modulo bcrypt per criptare password

// Importa Stripe per gestire pagamenti online e inizializza con la chiave API test
const stripe = require('stripe')('sk_test_51RTTSLFbljXrIje8zNiNi30WK064OWmPaUT4exuXiH2soQYraahkGExdLaBFvFFeSDUTJUBhqaecHABVziDZJiGx00lM6MNpdS'); // Inizializza Stripe con chiave segreta di test

// Importa multer, middleware per gestire upload di file (es. immagini)
const multer = require('multer'); // Carica il modulo multer per upload file

// Permette a Express di leggere richieste con body in formato JSON
app.use(express.json()); // Middleware per parsare JSON nelle richieste

// Permette a Express di leggere dati inviati tramite form HTML (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false })); // Middleware per parsare dati form, extended false per oggetti semplici

// Espone la cartella 'images' come statica, così i file al suo interno possono essere accessibili tramite URL
app.use('/images', express.static('images')); // Serve file statici dalla cartella images sotto il path /images

// Importa il modulo 'path' per lavorare con i percorsi dei file in modo sicuro e indipendente dal sistema operativo
const path = require("path"); // Modulo built-in di Node.js per manipolare percorsi file

// Importa il modulo 'fs' (File System) per leggere, scrivere o modificare file sul disco
const fs = require('fs'); // Modulo built-in di Node.js per operazioni su file

// Importa la variabile 'name' dal modulo 'ejs' (motore di template per generare HTML dinamico)
// (Nota: questa importazione non è comune, solitamente si importa tutto 'ejs' con const ejs = require("ejs"))
const { name } = require("ejs"); // Importa solo la proprietà 'name' da ejs (probabilmente non usata)

// Serve la cartella principale del progetto (la cartella padre rispetto a Backend)
app.use(express.static(path.join(__dirname, "..")));  // Serve tutti i file statici dalla root del progetto

// Serve index.html alla root
app.get("/", (req, res) => { // Route GET per la homepage
  res.sendFile(path.join(__dirname, "..", "index.html")); // Invia il file index.html come risposta
});

// Funzione di test per stampare tutti gli utenti (solo per debug)
async function getData() { // Funzione asincrona per testare connessione DB
  try {
    const res = await client.query("select * from utenti;"); // Esegue query per selezionare tutti utenti
    for (let i = 0; i < res.rows.length; i++) { // Cicla sui risultati
      console.log(res.rows[i].name); // Stampa nome di ogni utente
    }
  } catch (err) {
    console.error("Errore nella query:", err); // Gestisce errori query
  }
}
getData(); // Chiama la funzione all'avvio del server

// Login utente
app.post("/api/login", async (req, res) => { // Endpoint POST per autenticazione utente
  const { username, password } = req.body; // Estrae username e password dal body della richiesta
  console.log("Tentativo login:", username); // Log del tentativo di login
  try {
    const result = await client.query("SELECT * FROM utenti WHERE name = $1", [username]); // Cerca utente per nome
    if (result.rows.length === 0) { // Se utente non trovato
      return res.status(400).json({ error: "Utente non trovato" }); // Restituisce errore 400
    }
    const utente = result.rows[0]; // Prende il primo risultato
    const isPasswordValid = await bcrypt.compare(password, utente.password); // Confronta password criptata
    if (!isPasswordValid) { // Se password non valida
      return res.status(401).json({ error: "Password errata" }); // Errore 401
    }
    res.json({ // Se login riuscito
      message: "Login effettuato con successo", // Messaggio di successo
      ruolo: utente.ruolo, // Ruolo dell'utente
      userId: utente.id  // ID dell'utente
    });
  } catch (err) {
    console.error("Errore login:", err); // Log errore
    res.status(500).json({ error: "Errore login" }); // Errore server
  }
});

// Registrazione utente
app.post("/api/register", async (req, res) => { // Endpoint POST per registrazione nuovo utente
  const { username, email, password, ruolo } = req.body; // Estrae dati dal body
  console.log("Ricevuto:", username, email, ruolo); // Log dati ricevuti
  try {
    const existing = await client.query("SELECT * FROM utenti WHERE email = $1", [email]); // Controlla se email esiste
    if (existing.rows.length > 0) { // Se email già registrata
      return res.status(400).json({ error: "Email già registrata" }); // Errore 400
    }
    const hashed = await bcrypt.hash(password, 10); // Cripta password con salt rounds 10
    const result = await client.query( // Inserisce nuovo utente
      "INSERT INTO utenti (name, email, password, ruolo, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id",
      [username, email, hashed, ruolo]
    );
    const newUserId = result.rows[0].id; // ID del nuovo utente
    res.json({ message: "Registrazione completata", ruolo, id: newUserId }); // Risposta successo
  } catch (err) {
    console.error("Errore server:", err); // Log errore
    res.status(500).json({ error: "Errore server" }); // Errore server
  }
});

// Stripe checkout session
app.post("/create-checkout-session", async (req, res) => { // Endpoint per creare sessione checkout Stripe per carrello
  const { items, userId } = req.body; // Estrae items e userId dal body

  if (!userId) { // Se userId mancante
    return res.status(400).json({ error: "Utente non loggato" }); // Errore
  }

  // Verifica che l'utente esista
  const checkUser = await client.query("SELECT id FROM utenti WHERE id = $1", [userId]); // Query per verificare utente
  if (checkUser.rows.length === 0) { // Se utente non esiste
    return res.status(400).json({ error: "Utente non valido" }); // Errore
  }

  if (!Array.isArray(items) || items.length === 0) { // Se items non è array o vuoto
    return res.status(400).json({ error: "Nessun prodotto nel carrello" }); // Errore
  }

  const line_items = items.map(item => ({ // Mappa items per Stripe
    price_data: {
      currency: "eur", // Valuta euro
      product_data: { name: item.name }, // Nome prodotto
      unit_amount: Math.round(Number(item.prezzo) * 100), // Prezzo in centesimi
    },
    quantity: item.quantita || 1, // Quantità, default 1
  }));

  try {
    const session = await stripe.checkout.sessions.create({ // Crea sessione Stripe
      payment_method_types: ["card"], // Metodo pagamento carta
      line_items, // Items da pagare
      mode: "payment", // Modalità pagamento
      success_url: `http://localhost:5500/success.html?userId=${userId}`, // URL successo con userId
      cancel_url: "http://localhost:5500/cancel.html", // URL cancellazione
    });
    res.json({ url: session.url }); // Restituisce URL sessione
  } catch (error) {
    console.error("Errore Stripe:", error); // Log errore
    res.status(500).json({ error: "Errore durante la creazione della sessione di pagamento" }); // Errore server
  }
});


// crea una checkout session per un singolo prodotto
// Questo endpoint è utile per pagamenti singoli, ad esempio per un prodotto specifico
app.post('/create-checkout-session-single', async (req, res) => { // Endpoint per checkout singolo prodotto
  const { name, price, quantity, userId } = req.body; // Estrae dati dal body

  if (!userId) { // Se userId mancante
    return res.status(400).json({ error: "Utente non loggato" }); // Errore
  }

  // Verifica che l'utente esista
  const checkUser = await client.query("SELECT id FROM utenti WHERE id = $1", [userId]); // Verifica utente
  if (checkUser.rows.length === 0) { // Se non esiste
    return res.status(400).json({ error: "Utente non valido" }); // Errore
  }

  try {
    const session = await stripe.checkout.sessions.create({ // Crea sessione Stripe
      payment_method_types: ['card'], // Carta di credito
      line_items: [{ // Singolo item
        price_data: {
          currency: 'eur', // Euro
          product_data: { name }, // Nome prodotto
          unit_amount: Math.round(price * 100), // Prezzo in centesimi
        },
        quantity: quantity || 1, // Quantità, default 1
      }],
      mode: 'payment', // Modalità pagamento
      success_url: `http://localhost:5500/success.html?userId=${userId}`, // URL successo
      cancel_url: 'http://localhost:5500/cancel.html', // URL cancellazione
    });

    res.json({ url: session.url }); // Restituisce URL
  } catch (err) {
    console.error("Errore Stripe:", err); // Log errore
    res.status(500).json({ error: 'Errore durante la creazione della sessione di pagamento' }); // Errore
  }
});


// Aggiungi prodotto al carrello
app.post("/api/add-to-cart", async (req, res) => { // Endpoint per aggiungere prodotto al carrello
  const { id_utente, id_prodotto, prezzo_totale, stato_carrello, quantita } = req.body; // Estrae dati
  try {
    const existing = await client.query( // Controlla se prodotto già nel carrello
      "SELECT * FROM carrello WHERE id_utente = $1 AND id_prodotto = $2 AND stato_carrello = $3",
      [id_utente, id_prodotto, stato_carrello]
    );
    if (existing.rows.length > 0) { // Se già presente
      // Incrementa la quantità se già presente
      await client.query( // Aggiorna quantità
        "UPDATE carrello SET quantita = quantita + $1 WHERE id_utente = $2 AND id_prodotto = $3 AND stato_carrello = $4",
        [quantita, id_utente, id_prodotto, stato_carrello]
      );
    } else { // Altrimenti
      // Inserisce nuovo prodotto nel carrello
      await client.query( // Inserisce nuovo record
        "INSERT INTO carrello (id_utente, id_prodotto, prezzo_totale, stato_carrello, quantita) VALUES ($1, $2, $3, $4, $5)",
        [id_utente, id_prodotto, prezzo_totale, stato_carrello, quantita]
      );
    }
    res.json({ message: "Prodotto aggiunto/aggiornato nel carrello" }); // Successo
  } catch (err) {
    console.error("Errore aggiunta carrello:", err); // Log errore
    res.status(500).json({ error: "Errore inserimento carrello" }); // Errore
  }
});

// Rimuovi prodotto dal carrello
app.delete("/api/remove-from-cart", async (req, res) => { // Endpoint DELETE per rimuovere prodotto dal carrello
  const { userId, prodottoId } = req.body; // Estrae userId e prodottoId
  try {
    await client.query( // Elimina record dal carrello
      "DELETE FROM carrello WHERE id_utente = $1 AND id_prodotto = $2",
      [userId, prodottoId]
    );
    res.json({ message: "Prodotto rimosso dal carrello" }); // Successo
  } catch (err) {
    console.error("Errore rimozione carrello:", err); // Log errore
    res.status(500).json({ error: "Errore server" }); // Errore
  }
});

// Dati account utente
app.get("/api/account/:id", async (req, res) => { // Endpoint GET per dati account utente
  const userId = req.params.id; // ID dall'URL
  try {
    const result = await client.query( // Query per selezionare utente
      "SELECT id, name, email, password, ruolo FROM utenti WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) { // Se non trovato
      return res.status(404).json({ error: "Utente non trovato" }); // Errore 404
    }
    res.json(result.rows[0]); // Restituisce dati utente
  } catch (err) {
    console.error("Errore recupero account:", err); // Log errore
    res.status(500).json({ error: "Errore server" }); // Errore
  }
});

// Carrello utente (con JOIN prodotti)
app.get("/api/cart/:id_utente", async (req, res) => { // Endpoint GET per carrello utente
  const id_utente = req.params.id_utente; // ID utente dall'URL
  try {
    //AS quantita_disponibile significa che, nel risultato della query, questo 
    // campo si chiamerà quantita_disponibile invece di solo quantita
    const result = await client.query( // Query JOIN per carrello e prodotti
      `SELECT c.id_carrello, c.id_prodotto, c.prezzo_totale, c.stato_carrello, c.quantita, p.name, 
      p.immagine, p.prezzo, p.quantita AS quantita_disponibile
      FROM carrello c
      JOIN prodotti p ON c.id_prodotto = p.id
      WHERE c.id_utente = $1 AND c.stato_carrello = true`,
      [id_utente]
    );
    // Decodifica immagine se presente
    result.rows.forEach(row => { // Cicla righe per gestire immagini
      if (!row.immagine) {
        row.immagine = 'placeholder.png'; // Placeholder se immagine mancante
      }
    });
    res.json(result.rows); // Restituisce carrello
  } catch (err) {
    console.error("Errore recupero carrello:", err); // Log errore
    res.status(500).json({ error: "Errore recupero carrello" }); // Errore
  }
});

// Aggiorna quantità nel carrello
app.put("/api/update-cart-quantity", async (req, res) => { // Endpoint PUT per aggiornare quantità carrello
  const { userId, prodottoId, quantity } = req.body; // Estrae dati
  try {
    await client.query( // Aggiorna quantità
      "UPDATE carrello SET quantita = $1 WHERE id_utente = $2 AND id_prodotto = $3",
      [quantity, userId, prodottoId]
    );
    res.json({ message: "Quantità aggiornata" }); // Successo
  } catch (err) {
    console.error("Errore update quantity:", err); // Log errore
    res.status(500).json({ error: "Errore aggiornamento quantità" }); // Errore
  }
});

// Restituisce tutti i prodotti

app.get('/api/prodotti', async (req, res) => { // Endpoint GET per tutti i prodotti
  try {
    const result = await client.query( // Query JOIN per prodotti e artigiani
      'SELECT prodotti.id, prezzo, descrizione, disponibilita, prodotti.immagine, quantita, id_utente, prodotti.created_at, utenti.name AS artigiano_name , prodotti.name AS prodotto_name FROM prodotti inner join utenti on prodotti.id_utente= utenti.id'
    );
 
    res.json(result.rows); // Restituisce prodotti
  } catch (err) {
    console.error("Errore query prodotti:", err); // Log errore
    res.status(500).json({ error: 'Errore nella query SQL' }); // Errore
  }
});

// Completa ordine: crea un ordine e svuota il carrello
app.post("/api/complete-order", async (req, res) => { // Endpoint POST per completare ordine
  const { userId } = req.body; // Estrae userId
  const userIdInt = parseInt(userId); // Converte a intero
  console.log("userId ricevuto:", userId, typeof userId, "parsed:", userIdInt); // Log
  const checkUser = await client.query("SELECT id FROM utenti WHERE id = $1", [userIdInt]); // Verifica utente
  console.log("checkUser rows:", checkUser.rows.length); // Log
  if (checkUser.rows.length === 0) { // Se utente non valido
    return res.status(400).json({ error: "Utente non valido" }); // Errore
  }
  try {
    // Prendi tutti i prodotti nel carrello dell'utente
    const carrello = await client.query( // Query carrello
      "SELECT * FROM carrello WHERE id_utente = $1 AND stato_carrello = true",
      [userId]
    );
    // Calcola il totale dell'ordine
    let totale = 0; // Inizializza totale
    carrello.rows.forEach(item => { // Cicla per calcolare totale
      totale += Number(item.quantita) * Number(item.prezzo_totale); // Somma
    });


    // Aggiorna la quantità disponibile dei prodotti
    // Ciclo su tutti gli elementi dentro carrello.rows
    for (const item of carrello.rows) { // Ciclo per aggiornare quantità prodotti

      // Per ogni item (oggetto con almeno item.quantita e item.id_prodotto)
      // eseguo una query SQL sul database PostgreSQL.
      // Uso await perché client.query() restituisce una Promise (operazione asincrona).
      await client.query( // Aggiorna quantità prodotto
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
    await client.query( // Imposta non disponibili prodotti esauriti
      "UPDATE prodotti SET disponibilita = false WHERE quantita = 0"
    );

    // Crea un solo ordine con il totale
    await client.query( // Inserisce ordine
      "INSERT INTO ordine (id_utente, totale, stato_ordine, chiusura_ordine) VALUES ($1, $2, $3, NOW())",
      [userId, totale, 'completato']
    );
    // Svuota il carrello dell'utente
    await client.query( // Elimina carrello
      "DELETE FROM carrello WHERE id_utente = $1 AND stato_carrello = true",
      [userId]
    );
    res.json({ message: "Ordine completato e carrello svuotato" }); // Successo
  } catch (err) {
    console.error("Errore completamento ordine:", err); // Log errore
    res.status(500).json({ error: "Errore completamento ordine" }); // Errore
  }
});

// Restituisce tutti gli ordini dell'utente se non si è loggati come amministratore altrimenti stampa tutti gli ordini 
app.get('/api/orders/:userId', async (req, res) => { // Endpoint GET per ordini utente/admin
  const userId = req.params.userId; // ID utente dall'URL
  console.log(`➡️ Richiesta ordini per userId: ${userId}`); // Log richiesta
  try {
    // 1. Recupera il ruolo dell'utente
    const ruoloResult = await client.query( // Query ruolo
      'SELECT ruolo FROM utenti WHERE id = $1',
      [userId]
    );
    console.log("📄 Risultato query ruolo:", ruoloResult.rows); // Log
    if (ruoloResult.rows.length === 0) { // Se utente non trovato
      console.warn("⚠️ Utente non trovato"); // Warn
      return res.status(404).json({ error: "Utente non trovato" }); // Errore 404
    }
    const ruolo = ruoloResult.rows[0].ruolo; // Estrae ruolo
    console.log(`👤 Ruolo utente: ${ruolo}`); // Log ruolo
    // 2. Se è amministratore, prendi tutti gli ordini
    let orders; // Variabile per ordini
    if (ruolo === 'amministratore') { // Se admin
      console.log("🔓 Accesso come amministratore: recupero tutti gli ordini"); // Log
      orders = await client.query('SELECT * FROM ordine'); // Tutti ordini
    } else { // Altrimenti
      console.log("🔒 Accesso come utente normale: recupero ordini personali"); // Log
      orders = await client.query( // Ordini personali
        'SELECT * FROM ordine WHERE id_utente = $1',
        [userId]
      );
    }
    console.log(`📦 Numero ordini trovati: ${orders.rows.length}`); // Log numero
    res.json(orders.rows); // Restituisce ordini
  } catch (err) {
    console.error("❌ Errore recupero ordini:", err); // Log errore
    res.status(500).json({ error: "Errore recupero ordini" }); // Errore
  }
});



// Inserimento prodotto (endpoint alternativo)
app.post('/api/insert-product', async (req, res) => { // Endpoint POST per inserire prodotto
  const { userId, name, prezzo, descrizione, disponibilita, immagine, quantita } = req.body; // Estrae dati
  if (!userId || !name || !prezzo) { // Controlla campi obbligatori
    return res.status(400).json({ error: "Campi obbligatori mancanti" }); // Errore
  }
  try {
    await client.query( // Inserisce prodotto
      `INSERT INTO prodotti 
       (id_utente, name, prezzo, descrizione, disponibilita, immagine, quantita) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, name, prezzo, descrizione, disponibilita, immagine, quantita]
    );
    res.json({ message: "Prodotto inserito correttamente" }); // Successo
  } catch (err) {
    console.error("Errore inserimento prodotto:", err); // Log errore
    res.status(500).json({ error: "Errore server durante inserimento prodotto" }); // Errore
  }
});

// Multer per il caricamento immagini
const storage = multer.diskStorage({ // Configurazione storage multer
  destination: (req, file, cb) => cb(null, "images/"), // Salva in images/
  filename: (req, file, cb) => { // Nome file
    const ext = path.extname(file.originalname); // Estensione originale
    cb(null, Date.now() + ext); // Timestamp + estensione
  }
});
const upload = multer({ storage }); // Istanza multer

// Serve file statici e immagini
app.use(express.static("public")); // Serve public/
app.use("/images", express.static("images")); // Serve images/

// Inserimento prodotto con immagine (endpoint alternativo)
app.post("/api/prodotti", upload.single("immagine"), (req, res) => { // POST con upload immagine
  const { nome, descrizione, prezzo, quantita, id_utente } = req.body; // Estrae dati
  const disponibilita = quantita > 0; // Disponibile se quantita > 0
  const immagine = req.file ? req.file.filename : null; // Nome file se caricato
  if (!id_utente) { // Controlla id_utente
    return res.status(400).json({ message: "ID utente mancante." }); // Errore
  }
  // Costruisce la query SQL per inserire un nuovo prodotto nel database.
  // I valori ($1, $2, ...) sono segnaposto che verranno sostituiti con i dati reali forniti dall'utente.
  const sql = ` // Query inserimento
    INSERT INTO prodotti (name, descrizione, prezzo, quantita, id_utente, immagine, disponibilita)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`;
    // Esegue la query di inserimento nel database PostgreSQL.
    // Il secondo parametro è un array con i valori da inserire nei segnaposto della query.
    // La funzione di callback gestisce il risultato o eventuali errori.
    client.query( // Esegue query
      sql, // La query SQL da eseguire
      [nome, descrizione, prezzo, quantita, id_utente, immagine, disponibilita], // Valori da inserire
      (err, result) => { // Callback
        if (err) { // Se errore
          // Se c'è un errore nell'inserimento (es: vincoli violati), stampa l'errore e risponde con errore 500
          console.error("Errore DB:", err); // Log errore
          return res.status(500).json({ message: "Errore durante l'inserimento." }); // Errore 500
        }
        // Se l'inserimento va a buon fine, restituisce un messaggio di successo e l'id del nuovo prodotto
        res.status(201).json({ message: "Prodotto inserito!", id: result.rows[0]?.id }); // Successo 201
  });
});

// Riallinea la sequenza degli ID prodotti
client.query(`SELECT setval('prodotti_id_seq', (SELECT MAX(id) FROM prodotti))`, (err) => { // Riallinea sequenza ID
  if (err) {
    console.error("❌ Errore nel riallineare la sequenza prodotti_id_seq:", err); // Log errore
  } else {
    console.log("✅ Sequenza prodotti_id_seq riallineata con l'ID massimo corrente."); // Log successo
  }
});

// Modifica prodotto
app.post("/api/modifica-prodotto", upload.single("immagine"), (req, res) => { // POST modifica prodotto con upload
  const { name, prezzo, descrizione, quantita, userId } = req.body; // Estrae dati
  const disponibilita = quantita && quantita > 0; // Disponibile se quantita > 0
  const immagine = req.file ? req.file.filename : null; // Nome immagine se caricata
  if (!userId || !name) { // Controlla campi obbligatori
    return res.status(400).json({ message: "Campi obbligatori mancanti (userId o name)" }); // Errore
  }
  const check = `SELECT * FROM prodotti WHERE name = $1 AND id_utente = $2`; // Query verifica
  client.query(check, [name, userId], (err, results) => { // Esegue verifica
    if (err) return res.status(500).json({ message: "Errore DB nella verifica" }); // Errore DB
    if (results.rows.length === 0) { // Se prodotto non trovato
      return res.status(404).json({ message: "Prodotto non trovato o non tuo" }); // Errore 404
    }
    // Costruisci dinamicamente i campi da aggiornare
    const fields = []; // Array campi
    const values = []; // Array valori
    let i = 1; // Contatore parametri
    if (prezzo) { // Se prezzo fornito
      fields.push(`prezzo = $${i++}`); // Aggiungi campo
      values.push(prezzo); // Aggiungi valore
    }
    if (descrizione) { // Se descrizione
      fields.push(`descrizione = $${i++}`);
      values.push(descrizione);
    }
    if (quantita) { // Se quantita
      fields.push(`quantita = $${i++}`);
      values.push(quantita);
      fields.push(`disponibilita = $${i++}`);
      values.push(disponibilita);
    }
    if (immagine) { // Se immagine
      fields.push(`immagine = $${i++}`);
      values.push(immagine);
    }
    if (fields.length === 0) { // Se nessun campo
      return res.status(400).json({ message: "Nessun campo da aggiornare" }); // Errore
    }
    // Completa la query
    const updateQuery = ` // Query update
      UPDATE prodotti SET ${fields.join(", ")}
      WHERE name = $${i++} AND id_utente = $${i}
    `;
    values.push(name, userId); // Aggiungi name e userId
    if (immagine) { // Se immagine nuova
  const vecchiaImmagine = results.rows[0].immagine; // Immagine vecchia
  const pathVecchia = path.join(__dirname, 'images', vecchiaImmagine.toString('utf8')); // Path vecchia
  if (fs.existsSync(pathVecchia)) { // Se esiste
    fs.unlinkSync(pathVecchia); // Elimina
  }
}
    client.query(updateQuery, values, (updateErr) => { // Esegue update
      if (updateErr) { // Se errore
        console.error("Errore update:", updateErr); // Log errore
        return res.status(500).json({ message: "Errore durante aggiornamento" }); // Errore 500
      }
      res.json({ message: "Prodotto aggiornato con successo" }); // Successo
    });
  });
});

// Modifica profilo utente
app.post("/api/modifica-account", async (req, res) => { // POST modifica account
  const { userId, username, email, password } = req.body; // Estrae dati
  if (!userId) { // Controlla userId
    return res.status(400).json({ message: "ID utente mancante" }); // Errore
  }
  try {
    // Verifica che esista
    const check = await client.query("SELECT * FROM utenti WHERE id = $1", [userId]); // Verifica utente
    if (check.rows.length === 0) { // Se non esiste
      return res.status(404).json({ message: "Utente non trovato" }); // Errore 404
    }
    // Costruiamo solo i campi presenti
    const fields = []; // Array campi
    const values = []; // Array valori
    let i = 1; // Contatore
    if (username) { // Se username
      fields.push(`name = $${i++}`);
      values.push(username);
    }
    if (email) { // Se email
      fields.push(`email = $${i++}`);
      values.push(email);
    }
    if (password) { // Se password
      const hashed = await bcrypt.hash(password, 10); // Cripta
      fields.push(`password = $${i++}`);
      values.push(hashed);
    }
    if (fields.length === 0) { // Se nessun campo
      return res.status(400).json({ message: "Nessun campo da aggiornare" }); // Errore
    }
    const updateQuery = ` // Query update
      UPDATE utenti SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING id
    `;
    values.push(userId); // Aggiungi userId
    const result = await client.query(updateQuery, values); // Esegue update
    res.json({ message: "Account aggiornato con successo", id: result.rows[0].id }); // Successo
  } catch (err) {
    console.error("Errore durante aggiornamento account:", err); // Log errore
    res.status(500).json({ message: "Errore server" }); // Errore
  }
});
app.delete('/api/utenti/:id', async (req, res) => { // DELETE utente per admin
    const userId = req.params.id; // ID dall'URL
    try {
        const result = await client.query('DELETE FROM utenti WHERE id = $1', [userId]); // Elimina utente
        if (result.rowCount === 0) { // Se non trovato
            return res.status(404).json({ error: 'Utente non trovato' }); // Errore 404
        }
        res.json({ message: 'Utente eliminato con successo' }); // Successo
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'utente:', error); // Log errore
        res.status(500).json({ error: 'Errore interno del server' }); // Errore 500
    }
});


app.put('/api/utenti/:id', async(req, res) => { // PUT aggiorna utente (ruolo/password)
  const { id } = req.params; // ID dall'URL
  const { ruolo, password } = req.body; // Ruolo e password dal body
  // Se viene fornita anche la password, aggiorna entrambi
  if (password && password.trim() !== "") { // Se password fornita
      const hashedPassword = await bcrypt.hash(password, 10); // Cripta password
    client.query( // Update ruolo e password
      'UPDATE utenti SET ruolo = $1, password = $2 WHERE id = $3',
      [ruolo, hashedPassword, id],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Errore aggiornamento dati' }); // Errore
        res.json({ message: 'Dati aggiornati con successo' }); // Successo
      }
    );
  } else { // Altrimenti solo ruolo
    client.query( // Update solo ruolo
      'UPDATE utenti SET ruolo = $1 WHERE id = $2',
      [ruolo, id],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Errore aggiornamento ruolo' }); // Errore
        res.json({ message: 'Ruolo aggiornato con successo' }); // Successo
      }
    );
  }
});

app.get('/api/utenti', (req, res) => { // GET lista utenti (escluso Admin)
  client.query( // Query utenti escluso Admin
  'SELECT id, name, email, ruolo FROM utenti WHERE name != $1',
  ['Admin'],
 (err, result) => {
    if (err) return res.status(500).json({ error: 'Errore nel caricamento utenti' }); // Errore
    res.json(result.rows); // Restituisce utenti
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
app.put('/api/prodotti/:id', upload.single('immagine'), async (req, res) => { // PUT aggiorna prodotto con immagine
  const { id } = req.params; // ID prodotto
  const { name, descrizione, prezzo, quantita, disponibilita, immaginePrecedente } = req.body; // Dati
  try {
    // 🧱 se c'è un nuovo file, gestiscilo
    let nomeFinale = immaginePrecedente; // Immagine precedente
    if (req.file) { // Se nuovo file
      nomeFinale = req.file.filename; // Nuovo nome
      // 🧹 elimina immagine precedente se presente
      const pathPrecedente = path.join(__dirname, 'images', immaginePrecedente); // Path precedente
      if (fs.existsSync(pathPrecedente)) { // Se esiste
        fs.unlinkSync(pathPrecedente); // Elimina
      }
    }
    const immagineHex = Buffer.from(nomeFinale, 'utf8').toString('hex'); // Converti in hex
    await client.query( // Update prodotto
      `UPDATE prodotti 
       SET name = $1, immagine = $2, descrizione = $3, prezzo = $4, quantita = $5, disponibilita = $6 
       WHERE id = $7`,
      [name, '\\x' + immagineHex, descrizione, prezzo, quantita, disponibilita, id]
    );
    res.json({ message: 'Prodotto aggiornato con successo' }); // Successo
  } catch (err) {
    console.error('Errore aggiornamento prodotto:', err); // Log errore
    res.status(500).json({ error: 'Errore aggiornamento' }); // Errore
  }
});

// Elimina un prodotto
app.delete('/api/prodotti/:id', async (req, res) => { // DELETE prodotto
  try {
    await client.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]); // Elimina prodotto
    res.json({ message: 'Prodotto eliminato con successo' }); // Successo
  } catch (err) {
    res.status(500).json({ error: 'Errore durante eliminazione' }); // Errore
  }
});
// Avvia il server sulla porta 3000
app.listen(3000, () => { // Avvia server Express su porta 3000
  console.log("port connected"); // Log conferma avvio server
});