--selezione tutti prodotti
SELECT prodotti.name, immagine, descrizione, prezzo, quantita , disponibilita ,utenti.name
FROM prodotti inner join utenti on id_utente= utenti.id;

--filtro ordinamento per artigiano 
SELECT prodotti.name, immagine, descrizione, prezzo, quantita , disponibilita ,utenti.name
FROM prodotti inner join utenti on id_utente= utenti.id
order by utenti.name;
-- filtro ordinamento disponibilità
SELECT prodotti.name, immagine, descrizione, prezzo, quantita , disponibilita , utenti.name
FROM prodotti inner join utenti on id_utente= utenti.id
order by disponibilita DESC;
--filtro ordinamento disponibilità con funzione per scrivere Disponibile o Non Disponibile
SELECT prodotti.name, immagine, descrizione, prezzo, quantita,
  CASE 
    WHEN disponibilita THEN 'Disponibile'
    ELSE 'Non disponibile'
  END AS stato_disponibilita,
  utenti.name
FROM prodotti
INNER JOIN utenti ON id_utente = utenti.id
ORDER BY disponibilita DESC;

--ordinamento dal prezzo più alto 
SELECT prodotti.name, immagine, descrizione, prezzo, quantita , disponibilita , utenti.name
FROM prodotti inner join utenti on id_utente= utenti.id
order by prezzo DESC;

--ordinamento dal prezzo più basso
SELECT prodotti.name, immagine, descrizione, prezzo, quantita , disponibilita , utenti.name
FROM prodotti inner join utenti on id_utente= utenti.id
order by prezzo ASC;

--ordinamento dal più disponibile
SELECT prodotti.name, immagine, descrizione, prezzo, quantita , disponibilita , utenti.name
FROM prodotti inner join utenti on id_utente= utenti.id
order by quantita DESC;

--ordinamento dal meno disponibile
SELECT prodotti.name, immagine, descrizione, prezzo, quantita , disponibilita , utenti.name
FROM prodotti inner join utenti on id_utente= utenti.id
order by quantita ASC;

--ordine alfabetico a-z
SELECT prodotti.name, immagine, descrizione, prezzo, quantita, disponibilita, utenti.name
FROM prodotti
INNER JOIN utenti ON id_utente = utenti.id
ORDER BY prodotti.name ASC;

--ordine alfabetico a-z
SELECT prodotti.name, immagine, descrizione, prezzo, quantita, disponibilita, utenti.name
FROM prodotti
INNER JOIN utenti ON id_utente = utenti.id
ORDER BY prodotti.name DESC;

--caricato di recente 
SELECT prodotti.name, immagine, descrizione, prezzo, quantita, disponibilita, utenti.name
FROM prodotti
INNER JOIN utenti ON id_utente = utenti.id
ORDER BY prodotti.created_at DESC;