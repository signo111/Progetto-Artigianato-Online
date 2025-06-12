-- Falegnameria Verdi
INSERT INTO prodotti (id_utente, prezzo, descrizione, name) VALUES
((SELECT id FROM utenti WHERE name = 'Falegnameria Verdi'), 79.99, 'Sedia in legno massello con finitura noce', 'Sedia Verdi'),
((SELECT id FROM utenti WHERE name = 'Falegnameria Verdi'), 149.00, 'Tavolino artigianale quadrato', 'Tavolino Verdi'),
((SELECT id FROM utenti WHERE name = 'Falegnameria Verdi'), 29.90, 'Mensola da parete con supporti nascosti', 'Mensola Verdi'),

-- Rizzo Legnami
((SELECT id FROM utenti WHERE name = 'Rizzo Legnami'), 199.99, 'Comodino rustico in rovere', 'Comodino Rizzo'),
((SELECT id FROM utenti WHERE name = 'Rizzo Legnami'), 299.00, 'Cassettiera 3 cassetti lavorata a mano', 'Cassettiera Rizzo'),
((SELECT id FROM utenti WHERE name = 'Rizzo Legnami'), 99.50, 'Specchiera con cornice lavorata', 'Specchiera Rizzo'),

-- Serramenti De Luca
((SELECT id FROM utenti WHERE name = 'Serramenti De Luca'), 249.00, 'Porta interna laminata con inserti in vetro', 'Porta De Luca'),
((SELECT id FROM utenti WHERE name = 'Serramenti De Luca'), 325.00, 'Finestra a due ante in PVC', 'Finestra De Luca'),
((SELECT id FROM utenti WHERE name = 'Serramenti De Luca'), 89.00, 'Zanzariera su misura', 'Zanzariera De Luca'),

-- Officina Conti
((SELECT id FROM utenti WHERE name = 'Officina Conti'), 180.00, 'Ringhiera in ferro battuto decorata', 'Ringhiera Conti'),
((SELECT id FROM utenti WHERE name = 'Officina Conti'), 75.50, 'Supporto TV a parete in acciaio', 'Supporto Conti'),
((SELECT id FROM utenti WHERE name = 'Officina Conti'), 145.00, 'Portabottiglie in ferro battuto', 'Portabottiglie Conti'),

-- Elettrotecnica Greco
((SELECT id FROM utenti WHERE name = 'Elettrotecnica Greco'), 35.00, 'Adattatore smart Wi-Fi compatibile Alexa', 'Adattatore Greco'),
((SELECT id FROM utenti WHERE name = 'Elettrotecnica Greco'), 250.00, 'Impianto citofonico completo', 'Citofono Greco'),
((SELECT id FROM utenti WHERE name = 'Elettrotecnica Greco'), 79.90, 'Lampada LED da esterno con sensore', 'Lampada Greco'),

-- Impianti Longo
((SELECT id FROM utenti WHERE name = 'Impianti Longo'), 560.00, 'Quadro elettrico da cantiere trifase', 'Quadro Longo'),
((SELECT id FROM utenti WHERE name = 'Impianti Longo'), 320.00, 'Sistema antifurto wireless', 'Antifurto Longo'),
((SELECT id FROM utenti WHERE name = 'Impianti Longo'), 95.00, 'Rivelatore di fumo smart', 'Rilevatore Longo'),

-- Leone Restauri
((SELECT id FROM utenti WHERE name = 'Leone Restauri'), 190.00, 'Stucco decorativo effetto marmorino', 'Stucco Leone'),
((SELECT id FROM utenti WHERE name = 'Leone Restauri'), 420.00, 'Restauro persiane in legno', 'Persiane Leone'),
((SELECT id FROM utenti WHERE name = 'Leone Restauri'), 150.00, 'Finitura antimuffa traspirante', 'Finitura Leone'),

-- Orlando Costruzioni
((SELECT id FROM utenti WHERE name = 'Orlando Costruzioni'), 799.00, 'Muretto da giardino in tufo', 'Muretto Orlando'),
((SELECT id FROM utenti WHERE name = 'Orlando Costruzioni'), 1450.00, 'Gazebo in legno trattato', 'Gazebo Orlando'),
((SELECT id FROM utenti WHERE name = 'Orlando Costruzioni'), 260.00, 'Pavimento autobloccante in cemento', 'Pavimento Orlando'),

-- Sala Tinteggiature
((SELECT id FROM utenti WHERE name = 'Sala Tinteggiature'), 120.00, 'Servizio tinteggiatura camera standard', 'Tinteggiatura Sala'),
((SELECT id FROM utenti WHERE name = 'Sala Tinteggiature'), 85.00, 'Decorazione parete effetto spatolato', 'Decorazione Sala'),
((SELECT id FROM utenti WHERE name = 'Sala Tinteggiature'), 60.00, 'Pittura antimacchia per soffitti', 'Pittura Sala'),

-- Grassi Impianti Elettrici
((SELECT id FROM utenti WHERE name = 'Grassi Impianti Elettrici'), 310.00, 'Impianto LED per interni con sensore', 'Impianto Grassi'),
((SELECT id FROM utenti WHERE name = 'Grassi Impianti Elettrici'), 270.00, 'Centralina domotica con controllo remoto', 'Domotica Grassi'),
((SELECT id FROM utenti WHERE name = 'Grassi Impianti Elettrici'), 95.00, 'Interruttore touch moderno', 'Interruttore Grassi');
