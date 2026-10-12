# 🛠️ Guida Deploy Solar Dashboard (Ubuntu & Linux)

Questa cartella contiene gli script e i comandi di riferimento per eseguire il deploy del **Backend** (Cloudflare Worker) e del **Frontend** (Cloudflare Pages).

---

## 🚀 Esecuzione Rapida con gli Script

Dalla cartella principale `SolarDashboard`:

```bash
cd /home/giuspo/Public/SolarMonitorApp/SolarDashboard
```

### 1. Deploy Solo Backend (Cloudflare Worker & D1 Database)
```bash
bash scripts/deploy_backend.sh
```

### 2. Deploy Solo Frontend (Build Vite PWA & Cloudflare Pages)
```bash
bash scripts/deploy_frontend.sh
```

### 3. Deploy Completo (Backend + Frontend in sequenza)
```bash
bash scripts/deploy_all.sh
```

---

## 📋 Comandi Manuali di Riferimento

Se preferisci lanciare i comandi manualmente passo per passo:

### 🔹 Backend
```bash
cd /home/giuspo/Public/SolarMonitorApp/SolarDashboard/backend

# Installazione dipendenze (solo se necessario)
npm install

# Test/Sviluppo locale
npm run dev

# Deploy su Cloudflare Worker
npm run deploy
```

### 🔹 Frontend
```bash
cd /home/giuspo/Public/SolarMonitorApp/SolarDashboard/frontend

# Installazione dipendenze (solo se necessario)
npm install

# Test/Sviluppo locale
npm run dev

# Compilazione PWA
npm run build

# Deploy su Cloudflare Pages
npx wrangler pages deploy dist --project-name=spog-solar-monitor-box --branch=main
```

---

## 🔑 Prerequisiti & Autenticazione Cloudflare

La prima volta che usi `wrangler` su una nuova macchina Ubuntu, devi autenticarti con il tuo account Cloudflare:

```bash
npx wrangler login
```

Si aprirà il browser per confermare l'accesso. Una volta autorizzato, i deploy funzioneranno automaticamente.

---

## 🗄️ Comandi Utili per il Database D1 (Cloudflare)

Dalla cartella `backend/`:

* **Controllare i record nel database remoto:**
  ```bash
  npx wrangler d1 execute solar-db --remote --command="SELECT COUNT(*) FROM solar_records;"
  ```

* **Vedere gli ultimi record salvati:**
  ```bash
  npx wrangler d1 execute solar-db --remote --command="SELECT datetime_local, v_bat, w_pan, is_valid FROM solar_records ORDER BY tstamp DESC LIMIT 10;"
  ```

* **Controllare i riepiloghi giornalieri:**
  ```bash
  npx wrangler d1 execute solar-db --remote --command="SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 5;"
  ```

