-- Tabella record raw (1 record ogni 10 min)
CREATE TABLE IF NOT EXISTS solar_records (
    tstamp INTEGER PRIMARY KEY,         -- Unix timestamp
    datetime_local TEXT NOT NULL,       -- ISO string Europe/Rome
    v_pan REAL NOT NULL,                -- Tensione pannello (V)
    i_pan REAL NOT NULL,                -- Corrente pannello (A)
    w_pan REAL NOT NULL,                -- Potenza pannello (W)
    v_bat REAL NOT NULL,                -- Tensione batteria (V)
    i_bat REAL NOT NULL,                -- Corrente batteria (A)
    w_bat REAL NOT NULL,                -- Potenza batteria (W)
    rssi INTEGER,                       -- Wi-Fi RSSI (dBm)
    is_valid BOOLEAN NOT NULL,          -- Flag validità fisica
    t_box REAL,                         -- Temp quadretto (°C)
    cloud REAL                          -- Nuvolosità (0.00 - 1.00)
);

-- Tabella aggregata giornaliera (1 record per giorno, calcoli rapidi per la PWA)
CREATE TABLE IF NOT EXISTS daily_summaries (
    date TEXT PRIMARY KEY,              -- 'YYYY-MM-DD'
    wh_produced REAL DEFAULT 0,         -- Energia totale prodotta dal pannello (Wh)
    wh_battery_charge REAL DEFAULT 0,   -- Energia immessa in batteria (Wh)
    wh_battery_discharge REAL DEFAULT 0,-- Energia prelevata dalla batteria (Wh)
    peak_power_w REAL DEFAULT 0,        -- Picco massimo di potenza (W)
    peak_power_time TEXT,               -- Orario del picco (HH:MM)
    v_bat_min REAL,                     -- Tensione minima registrata batteria (V)
    v_bat_max REAL,                     -- Tensione massima registrata batteria (V)
    avg_cloud REAL,                     -- Nuvolosità media giornaliera
    t_box_max REAL,                     -- Temperatura massima quadro (°C)
    anomaly_count INTEGER DEFAULT 0     -- Numero di misurazioni con is_valid = false
);

-- Tabella utenti autorizzati all'accesso (Whitelist dinamica)
CREATE TABLE IF NOT EXISTS authorized_users (
    email TEXT PRIMARY KEY,             -- Email dell'utente abilitato
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Inserisci qui la tua email Google per essere autorizzato al login
INSERT OR IGNORE INTO authorized_users (email) VALUES ('giuliosporti@gmail.com');

