require("dotenv").config({ path: "C:/Users/preinstaller/Desktop/LavoroWeb/Progetto-Artigianato-Online/variabili.env" });

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres", // Default to "postgres"
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Artigianato",
  password: process.env.DB_PASS || "labb", // Ensure password is always a string
  port: process.env.DB_PORT || 5432,
});


module.exports = pool;
