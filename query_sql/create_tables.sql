-- Create tables for the artigianato online project

-- Users table
CREATE TABLE IF NOT EXISTS utenti (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  ruolo VARCHAR(50) NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS prodotti (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  immagine BYTEA,
  descrizione TEXT,
  prezzo DECIMAL(10,2) NOT NULL,
  quantita INTEGER NOT NULL DEFAULT 0,
  disponibilita BOOLEAN DEFAULT TRUE,
  id_utente INTEGER REFERENCES utenti(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cart table
CREATE TABLE IF NOT EXISTS carrello (
  id_carrello SERIAL PRIMARY KEY,
  id_utente INTEGER REFERENCES utenti(id),
  id_prodotto INTEGER REFERENCES prodotti(id),
  prezzo_totale DECIMAL(10,2) NOT NULL,
  stato_carrello BOOLEAN DEFAULT TRUE,
  quantita INTEGER NOT NULL DEFAULT 1
);

-- Orders table
CREATE TABLE IF NOT EXISTS ordine (
  id SERIAL PRIMARY KEY,
  id_utente INTEGER REFERENCES utenti(id),
  totale DECIMAL(10,2) NOT NULL,
  stato_ordine VARCHAR(50) DEFAULT 'in elaborazione',
  chiusura_ordine TIMESTAMP DEFAULT NOW()
);