import { Hono, Context, Next } from 'hono';
import { APP_VERSION } from './version';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import { fetchAdafruitData, AdafruitPayload } from './adafruit';
import { saveRecordsToD1, updateDailySummary } from './db';
import { verifyGoogleToken, generateApiToken, verifyStaticApiKey } from './auth';
import * as cloudflareJwt from '@tsndr/cloudflare-worker-jwt';

export interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  ESP32_API_KEY: string;
  FRONTEND_ORIGIN?: string;
  ADAFRUIT_AIO_KEY: string;
  ADAFRUIT_USERNAME: string;
  ADAFRUIT_FEED: string;
}

type Variables = { userEmail: string };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Abilita CORS fail-closed (consente solo le origini esplicitamente dichiarate in FRONTEND_ORIGIN)
app.use('/api/*', cors({
  origin: (origin, c) => {
    const allowedOrigin = c.env.FRONTEND_ORIGIN;
    if (!allowedOrigin) return '';
    const allowedList = allowedOrigin.split(',').map((o: string) => o.trim());
    return allowedList.includes(origin) ? origin : '';
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  credentials: true,
}));

// --- MIDDLEWARE 1: AUTENTICAZIONE HARDWARE ESP32 (API KEY STATICA DA c.env.ESP32_API_KEY) ---
async function requireHardwareApiKey(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');
  const isValid = await verifyStaticApiKey(apiKey, c.env);

  if (!isValid) {
    return c.json({ error: 'Unauthorized: API Key hardware mancante o non valida' }, 401);
  }
  await next();
}

// --- MIDDLEWARE 2: AUTENTICAZIONE FRONTEND WEB (JWT / COOKIE DA c.env.AUTH_SECRET + WHITELIST DB) ---
async function requireFrontendAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  if (!c.env.AUTH_SECRET) {
    console.error('CRITICAL: Variabile d\'ambiente c.env.AUTH_SECRET mancante.');
    return c.json({ error: 'Unauthorized: Configurazione sessione mancante' }, 401);
  }

  // Supporta sia Cookie di sessione HttpOnly sia header Authorization: Bearer <token>
  let token = getCookie(c, '__Host-session');
  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return c.json({ error: 'Unauthorized: Credenziali mancanti' }, 401);
  }

  try {
    const isValid = await cloudflareJwt.verify(token, c.env.AUTH_SECRET, { algorithm: 'HS256' });
    if (!isValid) {
      return c.json({ error: 'Unauthorized: Token non valido o scaduto' }, 401);
    }

    const decoded = cloudflareJwt.decode(token);
    const email = (decoded?.payload as { email?: unknown })?.email;
    if (typeof email !== 'string' || !email) {
      return c.json({ error: 'Unauthorized: Payload token non valido' }, 401);
    }

    // Verifica attiva sulla whitelist per garantire revoca immediata degli utenti rimossi
    const dbUser = await c.env.DB.prepare(
      'SELECT email FROM authorized_users WHERE email = ?'
    ).bind(email).first();

    if (!dbUser) {
      return c.json({ error: 'Unauthorized: Utente non più autorizzato' }, 401);
    }

    c.set('userEmail', email);
  } catch {
    return c.json({ error: 'Unauthorized: Token non valido o scaduto' }, 401);
  }

  await next();
}

// --- GUARDIA GLOBALE FAIL-CLOSED (ANTEPOSTA A TUTTE LE ROUTE) ---
const PUBLIC_ROUTES = new Set(['GET /api/status', 'POST /api/auth/social-login']);
const HARDWARE_ROUTES = new Set(['POST /api/telemetry']);

app.use('/api/*', async (c, next) => {
  const key = `${c.req.method} ${c.req.path}`;
  if (PUBLIC_ROUTES.has(key)) return next();
  if (HARDWARE_ROUTES.has(key)) return requireHardwareApiKey(c, next);
  return requireFrontendAuth(c, next);
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

// --- 1. ROUTE PUBBLICHE ---
app.get('/api/status', (c) => c.json({ status: 'ok', version: APP_VERSION }));

app.post('/api/auth/social-login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== 'string') {
    return c.json({ error: 'Token mancante' }, 401);
  }

  const googleUser = await verifyGoogleToken(idToken, c.env);
  if (!googleUser) {
    return c.json({ error: 'Token Google non valido o Audience non corrispondente' }, 401);
  }

  const dbUser = await c.env.DB.prepare(
    'SELECT email FROM authorized_users WHERE email = ?'
  ).bind(googleUser.email).first();

  if (!dbUser) {
    return c.json({ error: 'Accesso Negato: Email non autorizzata nel DB.' }, 403);
  }

  const apiToken = await generateApiToken(googleUser.email, c.env);

  // Imposta anche cookie sicuro HttpOnly
  setCookie(c, '__Host-session', apiToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 24 * 60 * 60,
  });

  return c.json({ success: true, token: apiToken, user: googleUser });
});

// --- 2. ROUTE HARDWARE ESP32 (Protette da requireHardwareApiKey tramite guardia globale) ---
app.post('/api/telemetry', async (c) => {
  const payload = await c.req.json<AdafruitPayload | AdafruitPayload[]>().catch(() => null);
  if (!payload) {
    return c.json({ error: 'Payload JSON non valido' }, 400);
  }

  const records = Array.isArray(payload) ? payload : [payload];
  if (records.length === 0 || records.length > 500) {
    return c.json({ error: 'Numero di record non valido (max 500)' }, 413);
  }
  for (const r of records) {
    if (typeof r.tstamp !== 'number' || !Number.isFinite(r.tstamp) || r.tstamp <= 0) {
      return c.json({ error: 'Campo tstamp mancante o non valido' }, 400);
    }
  }

  try {
    const { inserted } = await saveRecordsToD1(c.env, records);
    if (inserted > 0) {
      await updateDailySummary(c.env);
    }
    return c.json({ success: true, inserted });
  } catch (error: any) {
    console.error('TELEMETRY INGEST ERROR:', error);
    return c.json({ success: false, error: 'Errore interno salvataggio telemetria' }, 500);
  }
});

// --- 3. ROUTE PROTETTE FRONTEND WEB (Protette da requireFrontendAuth tramite guardia globale) ---
app.post('/api/sync', async (c) => {
  try {
    const records = await fetchAdafruitData(c.env, 1000);
    const { inserted } = await saveRecordsToD1(c.env, records);
    await updateDailySummary(c.env);
    return c.json({ success: true, fetched: records.length, inserted });
  } catch (error: any) {
    console.error('SYNC ERROR:', error);
    return c.json({ success: false, error: 'Errore interno durante la sincronizzazione' }, 500);
  }
});

app.get('/api/today', async (c) => {
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' });
  const todayStr = formatter.format(new Date());
  const summary = await c.env.DB.prepare('SELECT * FROM daily_summaries WHERE date = ?').bind(todayStr).first();
  const { results: chartData } = await c.env.DB.prepare(
    'SELECT * FROM solar_records WHERE date(datetime_local) = ? ORDER BY tstamp ASC'
  ).bind(todayStr).all();
  return c.json({ success: true, summary, chartData });
});

app.get('/api/history-range', async (c) => {
  const start = c.req.query('start');
  const end = c.req.query('end');
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return c.json({ success: false, error: 'Parametri data start/end non validi (atteso YYYY-MM-DD)' }, 400);
  }
  try {
    const { results: rawData } = await c.env.DB.prepare(`
      SELECT * FROM solar_records 
      WHERE date(datetime_local) >= ? AND date(datetime_local) <= ?
      ORDER BY datetime_local ASC
    `).bind(start, end).all();
    return c.json({ success: true, data: rawData });
  } catch (err: any) {
    console.error('HISTORY RANGE ERROR:', err);
    return c.json({ success: false, error: 'Errore interno recupero storico' }, 500);
  }
});

app.get('/api/history-month/:month', async (c) => {
  const month = c.req.param('month'); // e.g. "2026-09"
  if (!MONTH_RE.test(month)) {
    return c.json({ success: false, error: 'Formato mese non valido (atteso YYYY-MM)' }, 400);
  }
  try {
    const { results: rawData } = await c.env.DB.prepare(`
      SELECT * FROM solar_records 
      WHERE datetime_local LIKE ? 
      ORDER BY datetime_local ASC
    `).bind(`${month}-%`).all();

    return c.json({ success: true, data: rawData });
  } catch (err: any) {
    console.error('HISTORY MONTH ERROR:', err);
    return c.json({ success: false, error: 'Errore interno recupero storico mensile' }, 500);
  }
});

app.get('/api/history/:date', async (c) => {
  const dateStr = c.req.param('date');
  if (!DATE_RE.test(dateStr)) {
    return c.json({ success: false, error: 'Formato data non valido (atteso YYYY-MM-DD)' }, 400);
  }
  const summary = await c.env.DB.prepare('SELECT * FROM daily_summaries WHERE date = ?').bind(dateStr).first();
  const { results: chartData } = await c.env.DB.prepare(
    'SELECT * FROM solar_records WHERE date(datetime_local) = ? ORDER BY tstamp ASC'
  ).bind(dateStr).all();
  return c.json({ success: true, summary, chartData });
});

app.get('/api/history', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 1000').all();
  return c.json({ success: true, history: results });
});

app.get('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const user = await c.env.DB.prepare('SELECT latitude, longitude FROM authorized_users WHERE email = ?').bind(email).first();
  return c.json({ success: true, settings: user });
});

app.post('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json().catch(() => null);
  const lat = Number(body?.latitude);
  const lon = Number(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return c.json({ success: false, error: 'Coordinate geografiche non valide' }, 400);
  }
  await c.env.DB.prepare('UPDATE authorized_users SET latitude = ?, longitude = ? WHERE email = ?')
    .bind(lat, lon, email)
    .run();
  return c.json({ success: true });
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const records = await fetchAdafruitData(env, 15);
      const { inserted } = await saveRecordsToD1(env, records);
      if (inserted > 0) {
        await updateDailySummary(env);
      }
    } catch (e) {
      console.error('CRON SYNC ERROR:', e);
    }
  }
};












