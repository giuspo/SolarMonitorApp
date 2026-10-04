import { Hono } from 'hono';
import { APP_VERSION } from './version';
import { cors } from 'hono/cors';
import { fetchAdafruitData } from './adafruit';
import { saveRecordsToD1, updateDailySummary } from './db';
import { verifyGoogleToken, generateApiToken } from './auth';
import * as cloudflareJwt from '@tsndr/cloudflare-worker-jwt';

export interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
  ADAFRUIT_AIO_KEY: string;
  ADAFRUIT_USERNAME: string;
  ADAFRUIT_FEED: string;
}

type Variables = { userEmail: string };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Abilita CORS per il frontend
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
}));

// --- ROUTE PUBBLICHE ---
app.get('/api/status', (c) => c.json({ status: 'ok', version: APP_VERSION }));

app.post('/api/auth/social-login', async (c) => {
  const body = await c.req.json();
  const idToken = body.idToken;
  if (!idToken) return c.json({ error: 'Token mancante' }, 400);

  const googleUser = await verifyGoogleToken(idToken);
  if (!googleUser) return c.json({ error: 'Token Google non valido' }, 401);

  const dbUser = await c.env.DB.prepare('SELECT email FROM authorized_users WHERE email = ?').bind(googleUser.email).first();
  
  if (!dbUser) {
    return c.json({ error: 'Accesso Negato: Email non autorizzata nel DB.' }, 403);
  }

  const apiToken = await generateApiToken(googleUser.email, c.env.AUTH_SECRET);
  return c.json({ success: true, token: apiToken, user: googleUser });
});

// --- MIDDLEWARE JWT ---
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.substring(7);
  try {
    const isValid = await cloudflareJwt.verify(token, c.env.AUTH_SECRET);
    if (!isValid) throw new Error("Invalid");
    const decoded = cloudflareJwt.decode(token);
    if (!decoded || !decoded.payload) throw new Error("Invalid payload");
    c.set('userEmail', (decoded.payload as any).email);
  } catch (e) {
    return c.json({ error: 'Token non valido o scaduto' }, 401);
  }
  await next();
});

// --- ROUTE PROTETTE (DATI) ---
app.post('/api/sync', async (c) => {
  try {
    const records = await fetchAdafruitData(c.env, 1000);
    const { inserted } = await saveRecordsToD1(c.env, records);
    await updateDailySummary(c.env);
    return c.json({ success: true, fetched: records.length, inserted });
  } catch (error: any) {
    console.error('SYNC ERROR:', error); return c.json({ success: false, error: error.message }, 500);
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
  try {
    const { results: rawData } = await c.env.DB.prepare(`
      SELECT * FROM solar_records 
      WHERE date(datetime_local) >= ? AND date(datetime_local) <= ?
      ORDER BY datetime_local ASC
    `).bind(start, end).all();
    return c.json({ success: true, data: rawData });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/api/history-month/:month', async (c) => {
  const month = c.req.param('month'); // e.g. "2026-09"
  try {
    const { results: rawData } = await c.env.DB.prepare(`
      SELECT * FROM solar_records 
      WHERE datetime_local LIKE ? 
      ORDER BY datetime_local ASC
    `).bind(`${month}-%`).all();

    return c.json({ success: true, data: rawData });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.get('/api/history/:date', async (c) => {
  const dateStr = c.req.param('date');
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
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE authorized_users SET latitude = ?, longitude = ? WHERE email = ?')
    .bind(body.latitude, body.longitude, email)
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
    } catch (e) {}
  }
};












