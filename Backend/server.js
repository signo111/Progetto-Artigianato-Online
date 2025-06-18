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
      unit_amount: item.amount, // deve essere in centesimi!
    },
    quantity: item.quantity,
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
    const { id_utente, id_prodotto, prezzo_totale, stato_carrello } = req.body;
    console.log("Ricevuto:", req.body);
    try {
        await client.query(
            "INSERT INTO carrello (id_utente, id_prodotto, prezzo_totale, stato_carrello) VALUES ($1, $2, $3, $4)",
            [id_utente, id_prodotto, prezzo_totale, stato_carrello]
        );
        res.json({ message: "Prodotto aggiunto al carrello nel DB" });
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

app.get('/api/orders/:userId', async (req, res) => {
  const userId = req.params.userId;
  // leggi dal DB gli ordini di questo utente
  const orders = await db.query('SELECT * FROM ordini WHERE user_id = $1', [userId]);
  res.json(orders.rows);
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


app.listen(3000,()=>{
    console.log("port connected")
})