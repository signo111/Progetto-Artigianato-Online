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

app.use(express.json())
app.use(express.urlencoded({extended:false}))

app.get("/",(req,res)=>{
    res.send("hello from backend")
})

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

    res.json({ message: "Login effettuato con successo", ruolo: utente.ruolo });
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
    await client.query(
      "INSERT INTO utenti (name, email, password, ruolo, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [username, email, hashed, ruolo]
    );
    console.log("Utente inserito!");
    res.json({ message: "Registrazione completata", ruolo });
  } catch (err) {
    console.error("Errore server:", err);
    res.status(500).json({ error: "Errore server" });
  }
});
app.listen(3000,()=>{
    console.log("port connected")
})