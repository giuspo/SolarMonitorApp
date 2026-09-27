import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';


export default function LoginPage({ onLogin }: { onLogin: (t: string) => void }) {
  const [error, setError] = useState('');

  const handleSuccess = async (credentialResponse: any) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787/api';
      const res = await fetch(`${API_BASE}/auth/social-login`, {
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
      <img src="/logo.png" alt="Solar Monitor Box" className="w-28 h-28 rounded-3xl shadow-2xl mb-6 ring-2 ring-amber-400/20 shadow-amber-500/10 object-cover" />
      <h1 className="text-3xl font-bold mb-2 text-slate-100">Solar Monitor Box</h1>
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






