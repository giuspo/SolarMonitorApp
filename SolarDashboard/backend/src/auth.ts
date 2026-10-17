import * as cloudflareJwt from '@tsndr/cloudflare-worker-jwt';
import type { Env } from './index';

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

// Verifica il token Google OAuth leggendo il Client ID esclusivamente dalle variabili d'ambiente di Cloudflare (env.GOOGLE_CLIENT_ID)
export async function verifyGoogleToken(
  idToken: string,
  env: Env
): Promise<{ email: string; name: string } | null> {
  const expectedClientId = env.GOOGLE_CLIENT_ID;
  if (!idToken || !expectedClientId) {
    console.error('CRITICAL: idToken mancante o variabile d\'ambiente env.GOOGLE_CLIENT_ID non configurata.');
    return null;
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as Record<string, any>;

    // 1. Verifica che l'issuer sia realmente Google
    if (!GOOGLE_ISSUERS.has(data.iss)) {
      return null;
    }

    // 2. CRITICO: Verifica che il token sia stato emesso per QUESTA applicazione usando env.GOOGLE_CLIENT_ID
    if (data.aud !== expectedClientId) {
      return null;
    }

    // 3. Verifica scadenza temporale del token
    const nowSec = Math.floor(Date.now() / 1000);
    if (!data.exp || Number(data.exp) <= nowSec) {
      return null;
    }

    // 4. Verifica che l'email sia validata da Google
    if (data.email_verified !== 'true' && data.email_verified !== true) {
      return null;
    }
    if (typeof data.email !== 'string' || !data.email.includes('@')) {
      return null;
    }

    return {
      email: data.email,
      name: typeof data.name === 'string' ? data.name : data.email,
    };
  } catch {
    return null;
  }
}

// Genera un JWT firmato dal Worker leggendo la chiave segreta esclusivamente da env.AUTH_SECRET
export async function generateApiToken(email: string, env: Env): Promise<string> {
  const secret = env.AUTH_SECRET;
  if (!secret) {
    throw new Error('Variabile d\'ambiente env.AUTH_SECRET non configurata su Cloudflare');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const token = await cloudflareJwt.sign(
    {
      email,
      iat: nowSec,
      exp: nowSec + 7 * 24 * 60 * 60, // Scade tra 7 giorni
    },
    secret,
    { algorithm: 'HS256' }
  );
  return token;
}

// Confronta l'API Key ricevuta nell'header con la chiave segreta letta da env.ESP32_API_KEY in tempo costante
export async function verifyStaticApiKey(
  providedKey: string | undefined,
  env: Env
): Promise<boolean> {
  const expectedKey = env.ESP32_API_KEY;
  if (!providedKey || !expectedKey) {
    return false;
  }

  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(providedKey)),
    crypto.subtle.digest('SHA-256', encoder.encode(expectedKey)),
  ]);

  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean;
  };
  if (typeof subtle.timingSafeEqual === 'function') {
    return subtle.timingSafeEqual(providedHash, expectedHash);
  }

  // Fallback constant-time byte-by-byte XOR comparison
  const a = new Uint8Array(providedHash);
  const b = new Uint8Array(expectedHash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}



