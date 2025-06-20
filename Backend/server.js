/*const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const pool = require("./db");// PostgreSQL connection
require("dotenv").config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// REGISTER USER (Save in Database)
app.post("/api/register", async (req, res) => {
    try {
        console.log("Incoming request body:", req.body);

        const { username, email, password, ruolo } = req.body; 

        if (!username || !email || !password) {
            return res.status(400).json({ error: "Missing required fields!" });
        }

        const existingUser = await pool.query("SELECT * FROM utenti WHERE email = $1", [email]);
        if (existingUser.rowCount > 0) {
            return res.status(400).json({ error: "Email già in uso!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const createdAt = new Date();

        await pool.query("INSERT INTO utenti (name, email, password, created_at, ruolo) VALUES ($1, $2, $3, $4, $5)", 
                         [username, email, hashedPassword, createdAt, ruolo]); 

        res.json({ message: `Registrazione completata con ruolo: ${ruolo}` });

    } catch (error) {
        console.error("Errore durante la registrazione:", error);
        res.status(500).json({ error: "Errore interno del server" });
    }
});
// Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
*/

const express=require("express")
const app=express()
const cors = require("cors");
app.use(cors());
const {client}=require("./db")
const bcrypt = require("bcrypt");
const stripe = require('stripe')('sk_test_51RTTSLFbljXrIje8zNiNi30WK064OWmPaUT4exuXiH2soQYraahkGExdLaBFvFFeSDUTJUBhqaecHABVziDZJiGx00lM6MNpdS');
const multer = require('multer');
app.use(express.json())
app.use(express.urlencoded({extended:false}))


const path = require("path");

// Serve la cartella principale del progetto (la cartella padre rispetto a Backend)
app.use(express.static(path.join(__dirname, "..")));  // serve tutti i file statici dalla root

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));  // serve index.html alla root
});

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

getData()

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
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
      userId: utente.id  // <-- aggiungi questo
    });
  } catch (err) {
    console.error("Errore login:", err);
    res.status(500).json({ error: "Errore login" });
  }
});

app.post("/api/register", async (req, res) => {
  const { username, email, password, ruolo } = req.body;
  console.log("Ricevuto:", username, email, ruolo);
  try {
    const existing = await client.query("SELECT * FROM utenti WHERE email = $1", [email]);
    console.log("Utente esistente:", existing.rows.length);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email già registrata" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await client.query(
      "INSERT INTO utenti (name, email, password, ruolo, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id",
      [username, email, hashed, ruolo]
    );
    const newUserId = result.rows[0].id;
    console.log("Utente inserito con id:", newUserId);
    res.json({ message: "Registrazione completata", ruolo, id: newUserId });
  } catch (err) {
    console.error("Errore server:", err);
    res.status(500).json({ error: "Errore server" });
  }
});



app.post("/create-checkout-session", async (req, res) => {
  const items = req.body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Nessun prodotto nel carrello" });
  }

  const line_items = items.map(item => ({
    price_data: {
      currency: "eur",
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(Number(item.prezzo) * 100), // deve essere in centesimi!
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


app.post("/api/add-to-cart", async (req, res) => {
  const { id_utente, id_prodotto, prezzo_totale, stato_carrello, quantita } = req.body;
  try {
    const existing = await client.query(
      "SELECT * FROM carrello WHERE id_utente = $1 AND id_prodotto = $2 AND stato_carrello = $3",
      [id_utente, id_prodotto, stato_carrello]
    );
    if (existing.rows.length > 0) {
      // Incrementa la quantità invece di resettarla!
      await client.query(
        "UPDATE carrello SET quantita = quantita + $1 WHERE id_utente = $2 AND id_prodotto = $3 AND stato_carrello = $4",
        [quantita, id_utente, id_prodotto, stato_carrello]
      );
    } else {
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

app.get("/api/cart/:id_utente", async (req, res) => {
  const id_utente = req.params.id_utente;
  try {
    // JOIN per prendere anche i dati del prodotto (nome, immagine, prezzo)
    const result = await client.query(
      `SELECT c.id_carrello, c.id_prodotto, c.prezzo_totale, c.stato_carrello, c.quantita, p.name, p.immagine, p.prezzo
      FROM carrello c
      JOIN prodotti p ON c.id_prodotto = p.id
      WHERE c.id_utente = $1 AND c.stato_carrello = true`,
      [id_utente]
    );
    result.rows.forEach(row => {
      row.immagine = row.immagine
        ? Buffer.from(row.immagine.slice(2), 'hex').toString()
        : '';
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Errore recupero carrello:", err);
    res.status(500).json({ error: "Errore recupero carrello" });
  }
});

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

//informazioni prodotto
app.get('/api/prodotti', async (req, res) => {
  try {
    const result = await client.query(
      'SELECT id, name, prezzo, descrizione, disponibilita, immagine, quantita, id_utente FROM prodotti'
    );

    result.rows.forEach(row => {
      if (row.immagine && typeof row.immagine === 'string') {
        try {
          const hex = row.immagine.replace(/^\\x/, '');
          const decoded = Buffer.from(hex, 'hex').toString(); // es: 'images/1.png'
          row.immagine = '/' + decoded; // es: '/images/1.png'
        } catch (err) {
          console.warn(`Errore parsing immagine prodotto ID ${row.id}:`, err);
          row.immagine = '/images/placeholder.png';
        }
      }
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Errore query prodotti:", err);
    res.status(500).json({ error: 'Errore nella query SQL' });
  }
});

app.post("/api/complete-order", async (req, res) => {
  const { userId } = req.body;
  try {
    // Prendi tutti i prodotti nel carrello dell'utente
    const carrello = await client.query(
      "SELECT * FROM carrello WHERE id_utente = $1 AND stato_carrello = true",
      [userId]
    );

    // Per ogni prodotto nel carrello, crea un ordine
    for (const item of carrello.rows) {
      await client.query(
        "INSERT INTO ordine (id_utente, id_carrello, stato_ordine, chiusura_ordine) VALUES ($1, $2, $3, NOW())",
        [userId, item.id_carrello, 'completato']
      );
    }

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

app.get('/api/orders/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const orders = await client.query('SELECT * FROM ordine WHERE id_utente = $1', [userId]);
    res.json(orders.rows);
  } catch (err) {
    console.error("Errore recupero ordini:", err);
    res.status(500).json({ error: "Errore recupero ordini" });
  }
});


//inserimento prodotti zeryab
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

app.use(express.static("public")); // per servire HTML e CSS
app.use("/images", express.static("images")); // per accedere alle immagini

app.post("/api/prodotti", upload.single("immagine"), (req, res) => {
  const { nome, descrizione, prezzo, quantita, id_utente } = req.body;
  const disponibilita = quantita > 0;

  const immagine = req.file ? req.file.filename : null;

  if (!id_utente) {
    return res.status(400).json({ message: "ID utente mancante." });
  }
const sql = `
  INSERT INTO prodotti (name, descrizione, prezzo, quantita, id_utente, immagine,disponibilita)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING id`;
  client.query(sql, [nome, descrizione, prezzo, quantita, id_utente, immagine], (err, result) => {
    if (err) {
      console.error("Errore DB:", err);
      return res.status(500).json({ message: "Errore durante l'inserimento." });
    }
    res.status(201).json({ message: "Prodotto inserito!", id: result.rows[0]?.id });

  });
});

// Solo se la sequenza esiste già (es: hai usato SERIAL)
client.query(`SELECT setval('prodotti_id_seq', (SELECT MAX(id) FROM prodotti))`, (err) => {
  if (err) {
    console.error("❌ Errore nel riallineare la sequenza prodotti_id_seq:", err);
  } else {
    console.log("✅ Sequenza prodotti_id_seq riallineata con l'ID massimo corrente.");
  }
});


app.listen(3000,()=>{
    console.log("port connected")
})