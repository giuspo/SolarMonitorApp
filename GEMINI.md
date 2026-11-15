# Contesto di Progetto: SolarMonitorApp

## 1. Scopo del Progetto (Ipotesi)
Il progetto **SolarMonitorApp** è un ecosistema completo IoT e di monitoraggio energetico per un impianto solare/fotovoltaico a batteria. 
Il sistema si articola su tre componenti interconnessi:
1. **IoT / Firmware (`SolarMonitorBox`)**: Dispositivo basato su microcontrollore ESP32 programmato con ESPHome che monitora in tempo reale grandezze elettriche e ambientali (tensione, corrente e potenza di pannelli e batterie, temperatura del quadretto, RSSI Wi-Fi, nuvolosità stimata) e invia i log ad Adafruit IO via MQTT/TLS.
2. **Backend API (`SolarDashboard/backend`)**: Cloudflare Worker serverless in TypeScript basato su framework Hono. Esegue cron job periodici per sincronizzare i dati da Adafruit IO salvandoli su un database relazionale Cloudflare D1 (SQLite), calcola aggregazioni e metriche giornaliere (Wh prodotti, cariche/scariche, picchi, anomalie) e gestisce l'autenticazione tramite Google OAuth e JWT.
3. **Frontend PWA (`SolarDashboard/frontend`)**: Single Page Application e Progressive Web App (PWA) sviluppata con React, Vite e Tailwind CSS. Fornisce all'utente finale viste per il monitoraggio in tempo reale ("Today"), storico aggregato ("History"), simulatore di resa ("Simulator"), diagnostica hardware/connessione ("Diagnostics") e configurazioni.

---

## 2. Stack Tecnologico Principale

### Firmware & IoT (`SolarMonitorBox`)
- **Piattaforma Hardware**: ESP32 (esp32dev) su framework Arduino.
- **Firmware Engine**: ESPHome (configurazione dichiarativa YAML con script e sensori custom).
- **Protocolli & Servizi Cloud**: MQTT su TLS / REST API verso Adafruit IO; geolocalizzazione e calcolo nuvolosità.

### Backend (`SolarDashboard/backend`)
- **Runtime**: Cloudflare Workers (Edge Serverless).
- **Linguaggio**: TypeScript (`tsc` 5.x).
- **Web Framework**: Hono (`hono` 4.x).
- **Database**: Cloudflare D1 (Serverless SQLite) con tabelle `solar_records`, `daily_summaries`, `authorized_users`.
- **Autenticazione**: Google OAuth (`verifyGoogleToken`) + JWT (`@tsndr/cloudflare-worker-jwt`) con whitelist dinamica su DB.
- **Strumenti di Deploy & Sviluppo**: Cloudflare Wrangler CLI.

### Frontend (`SolarDashboard/frontend`)
- **Linguaggio & Runtime**: TypeScript (~6.0) + React 19.
- **Build Tool**: Vite 8.
- **Styling**: Tailwind CSS v4 con PostCSS.
- **Librerie Principali**:
  - Grafici & Visualizzazione: `recharts`
  - Calcoli astronomici/solari: `suncalc`
  - Icone: `lucide-react`
  - Routing: `react-router-dom` v7
  - Auth: `@react-oauth/google`
  - PWA: `vite-plugin-pwa`
  - Linter: `oxlint`

---

## 3. Mappa Architetturale

```
SolarMonitorApp/
├── SolarMonitorBox/               # Configurazione Firmware & IoT (ESPHome)
│   ├── solar-monitor-box.yaml     # Entrypoint principale firmware ESPHome per ESP32
│   ├── config.yaml / secrets.yaml # Parametri di configurazione e credenziali Wi-Fi/Adafruit
│   ├── adafruit_certificate.pem   # Certificato TLS per broker Adafruit IO
│   ├── plans/                     # Documenti e specifiche progettuali hardware/firmware
│   └── scripts/                   # Script di supporto e flashing
│
├── SolarDashboard/                # Applicazione Web (Fullstack Cloudflare + React)
│   ├── backend/                   # Backend API Serverless
│   │   ├── src/
│   │   │   ├── index.ts           # Entrypoint Hono API & handler Cron/Fetch
│   │   │   ├── adafruit.ts        # Client per recupero dati da Adafruit IO
│   │   │   ├── auth.ts            # Validazione Google OAuth e emissione JWT
│   │   │   ├── db.ts              # Query D1 (inserimento letture, rollup giornalieri)
│   │   │   └── version.ts         # Metadati di versione
│   │   ├── schema.sql             # Struttura del database SQLite D1
│   │   └── wrangler.toml          # Configurazione Cloudflare Worker, binding D1 e cron triggers
│   │
│   ├── frontend/                  # Frontend Web & Mobile (PWA)
│   │   ├── src/
│   │   │   ├── main.tsx           # Bootstrap React nel DOM
│   │   │   ├── App.tsx            # Root component, routing e state di autenticazione
│   │   │   ├── components/        # Componenti UI riutilizzabili (BottomNav, card, grafici)
│   │   │   ├── pages/             # Schermate (TodayView, HistoryView, SimulatorView, DiagnosticsView, SettingsView, LoginPage)
│   │   │   ├── hooks/             # Custom React Hooks
│   │   │   ├── services/          # Chiamate API al backend Cloudflare
│   │   │   └── utils/             # Helper di formattazione, calcoli e conversioni
│   │   ├── index.html             # Template HTML dell'applicazione
│   │   ├── vite.config.ts         # Configurazione Vite e plugin PWA
│   │   └── package.json           # Dipendenze e script frontend
│   │
│   └── scripts/                   # Script shell unificati per deploy (deploy_all.sh, deploy_backend.sh, deploy_frontend.sh)
```

---

## 4. Pattern e Convenzioni

- **Architettura Disaccoppiata Hardware-to-Cloud**: L'hardware non parla direttamente con il database D1: trasmette telemetria ad Adafruit IO come broker/buffer intermedio; il backend Cloudflare legge periodicamente da Adafruit IO (mediante cron job `*/15 * * * *` o endpoint `/api/sync`) e persiste lo stato storicizzato.
- **Serverless & Edge First**: Sia l'hosting frontend che le API di backend sfruttano l'ecosistema Cloudflare per latenze minime e zero costi infrastrutturali fissi.
- **Rollup & Pre-aggregazione Dati**: Le misurazioni ad alta frequenza (`solar_records`) vengono elaborate e aggregate in `daily_summaries` per garantire performance istantanee nei grafici storici della PWA.
- **Zero-Trust Login Whitelist**: L'accesso all'app richiede login Google con validazione dell'email contro una whitelist memorizzata nella tabella `authorized_users` su D1, emettendo token JWT di sessione per le chiamate API successive.
- **Mobile-First PWA UX**: Layout responsive ottimizzato per smartphone con navigazione tramite `BottomNav`, caching offline e installabilità PWA.

---

## Regole Operative per l'Assistente AI

> [!IMPORTANT]
> **Vincolo di Esplorazione**:
> Durante le future sessioni di sviluppo e analisi, **NON eseguire mai scansioni ricorsive complete o indicizzazioni di massa** delle cartelle di build e delle dipendenze:
> - `node_modules/`
> - `dist/`
> - `.esphome/`
> - `.git/`
> - File binari o temporanei (`*.tsbuildinfo`, `.wrangler/`, cache).
> 
> Esamina esclusivamente i singoli file target rilevanti per il task richiesto dall'utente.

