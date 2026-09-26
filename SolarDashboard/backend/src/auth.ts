import { jwt } from 'hono/jwt';
import * as cloudflareJwt from '@tsndr/cloudflare-worker-jwt';

// Helper per verificare il token Google chiamando l'API ufficiale
export async function verifyGoogleToken(idToken: string): Promise<{ email: string, name: string } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + idToken);
    if (!response.ok) {
      return null;
    }
    const data = await response.json() as any;
    
    // Verifichiamo che l'email sia validata da Google
    if (data.email_verified !== 'true' && data.email_verified !== true) {
      return null;
    }
    
    return {
      email: data.email,
      name: data.name
    };
  } catch (err) {
    return null;
  }
}

// Genera un JWT firmato dal nostro Worker valido per 90 giorni
export async function generateApiToken(email: string, secret: string): Promise<string> {
  const token = await cloudflareJwt.sign({
    email,
    exp: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // Scade tra 90 giorni
  }, secret);
  return token;
}
