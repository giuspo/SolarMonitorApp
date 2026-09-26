import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Sun } from 'lucide-react';

export default function LoginPage({ onLogin }: { onLogin: (t: string) => void }) {
  const [error, setError] = useState('');

  const handleSuccess = async (credentialResponse: any) => {
    try {
      // Sostituisci localhost con il tuo URL Cloudflare in produzione
      const res = await fetch('http://localhost:8787/api/auth/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentialResponse.credential })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Accesso negato');
      }
    } catch (err) {
      setError('Errore di rete');
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
      <Sun className="w-20 h-20 text-yellow-400 mb-6" />
      <h1 className="text-3xl font-bold mb-2">SolarMonitor</h1>
      <p className="text-slate-400 mb-8">Accedi per visualizzare la dashboard</p>
      
      <div className="bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError('Login fallito lato Google')}
          useOneTap
        />
        {error && (
          <p className="text-red-400 text-sm mt-4 p-2 bg-red-900/30 rounded-lg">{error}</p>
        )}
      </div>
    </div>
  );
}
