const express = require("express");
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

        const { username, email, password, ruolo } = req.body; // Get `ruolo` dynamically

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
                         [username, email, hashedPassword, createdAt, ruolo]); // Now using dynamic `ruolo`

        res.json({ message: `Registrazione completata con ruolo: ${ruolo}` });

    } catch (error) {
        console.error("Errore durante la registrazione:", error);
        res.status(500).json({ error: "Errore interno del server" });
    }
});
// Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));





