import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Save, MapPin, Loader2, CheckCircle2 } from 'lucide-react';

export default function SettingsView() {
  const [lat, setLat] = useState<string>('');
  const [lon, setLon] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) {
        if (res.settings.latitude != null) setLat(res.settings.latitude.toString());
        if (res.settings.longitude != null) setLon(res.settings.longitude.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await api.updateSettings({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert("Il tuo browser non supporta la geolocalizzazione.");
      return;
    }
    
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLon(position.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (error) => {
        console.error(error);
        alert("Impossibile ottenere la posizione. Assicurati di aver dato i permessi al browser.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) return <div className="p-4 text-center mt-10">Caricamento impostazioni...</div>;

  return (
    <div className="p-4 flex flex-col gap-6 pb-24 max-w-lg mx-auto">
      <header className="mt-2">
        <h1 className="text-xl font-bold leading-tight">Impostazioni</h1>
        <p className="text-slate-400 text-xs font-medium">Configura i parametri del box</p>
      </header>

      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col gap-5">
        
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Posizione Geografica</h2>
          <p className="text-sm text-slate-400 mb-4">
            Necessaria per calcolare l'esatta elevazione del sole per la curva solare.
          </p>
          
          <button 
            type="button"
            onClick={handleGPS} 
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white py-3 px-4 rounded-xl font-medium transition-colors mb-6 disabled:opacity-50"
          >
            {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
            {gpsLoading ? 'Rilevamento in corso...' : 'Usa la mia posizione attuale (GPS)'}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300 uppercase">Latitudine</label>
              <input 
                type="number" 
                step="any"
                value={lat} 
                onChange={e => setLat(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                placeholder="es. 41.9028"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300 uppercase">Longitudine</label>
              <input 
                type="number" 
                step="any"
                value={lon} 
                onChange={e => setLon(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                placeholder="es. 12.4964"
              />
            </div>
          </div>

          {lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon)) && (
            <div className="mt-6 rounded-xl overflow-hidden border border-slate-600 h-48 w-full bg-slate-900 shadow-inner">
              <iframe
                title="Mappa Posizione"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${lat},${lon}&t=&z=12&ie=UTF8&iwloc=&output=embed`}
              ></iframe>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-700">
          <button 
            type="button"
            onClick={handleSave} 
            disabled={saving || !lat || !lon}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (success ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
            {saving ? 'Salvataggio...' : (success ? 'Salvato!' : 'Salva Impostazioni')}
          </button>
        </div>

      </div>
    </div>
  );
}

