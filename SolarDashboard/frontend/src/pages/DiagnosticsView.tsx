import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Thermometer, Wifi, ShieldAlert, ShieldCheck, Droplets, Lightbulb } from 'lucide-react';

function calculateDewPoint(tempC: number, rh: number): number | null {
  if (!Number.isFinite(tempC) || !Number.isFinite(rh) || tempC <= -40 || tempC >= 85 || rh <= 0 || rh > 100) {
    return null;
  }
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  return (b * gamma) / (a - gamma);
}

export default function DiagnosticsView() {
  const [data, setData] = useState<any>(null);
  const [apiVersion, setApiVersion] = useState<string>('caricamento...');
  const [loading, setLoading] = useState(true);
  const [corruptedLog, setCorruptedLog] = useState<any[]>([]);
  
  useEffect(() => {
    api.getToday().then(res => {
      api.getStatus().then((st: any) => setApiVersion(st.version || 'Sconosciuta')).catch(() => setApiVersion('Errore'));
      const records = res.chartData || [];
      setCorruptedLog(records.filter((r: any) => r.is_valid === 0 || r.is_valid === false));
      
      let tboxMax = -999;
      let tboxMaxTime = '--:--';
      let tboxMin = 999;
      let tboxMinTime = '--:--';
      let hboxMax = -999;
      let hboxMaxTime = '--:--';
      let hboxMin = 999;
      let hboxMinTime = '--:--';
      let rssiMin = 0;
      let rssiMinTime = '--:--';
      let rssiMax = -999;
      let rssiMaxTime = '--:--';

      records.forEach((r: any) => {
        if (r.is_valid === 0 || r.is_valid === false) return;

        const time = new Date(r.datetime_local).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        if (r.t_box != null && r.t_box !== -1 && r.t_box > -40 && r.t_box < 85) {
          if (r.t_box > tboxMax) { tboxMax = r.t_box; tboxMaxTime = time; }
          if (r.t_box < tboxMin) { tboxMin = r.t_box; tboxMinTime = time; }
        }
        if (r.h_box != null && r.h_box >= 0 && r.h_box <= 100) {
          if (r.h_box > hboxMax) { hboxMax = r.h_box; hboxMaxTime = time; }
          if (r.h_box < hboxMin) { hboxMin = r.h_box; hboxMinTime = time; }
        }
        if (r.rssi != null && r.rssi < 0) {
          if (r.rssi < rssiMin) { rssiMin = r.rssi; rssiMinTime = time; }
          if (r.rssi > rssiMax) { rssiMax = r.rssi; rssiMaxTime = time; }
        }
      });

      const validRecords = records.filter((r: any) => r.is_valid !== 0 && r.is_valid !== false);
      const latestWithFw = [...validRecords].reverse().find((r: any) => r.fw_ver);

      setData({ 
        summary: res.summary || {}, 
        current: validRecords.length > 0 ? validRecords[validRecords.length - 1] : (records.length > 0 ? records[records.length - 1] : {}),
        fwVer: latestWithFw?.fw_ver || '--',
        stats: {
            tboxMax: tboxMax === -999 ? '--' : tboxMax,
            tboxMaxTime,
            tboxMin: tboxMin === 999 ? '--' : tboxMin,
            tboxMinTime,
            hboxMax: hboxMax === -999 ? '--' : hboxMax,
            hboxMaxTime,
            hboxMin: hboxMin === 999 ? '--' : hboxMin,
            hboxMinTime,
            rssiMin: rssiMin === 0 ? '--' : rssiMin,
            rssiMinTime,
            rssiMax: rssiMax === -999 ? '--' : rssiMax,
            rssiMaxTime
        }
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div className="p-4 text-center mt-10">Caricamento diagnostica...</div>;

  const current = data?.current || {};
  const stats = data?.stats || {};
  const summary = data?.summary || {};

  const tbox = current.t_box ?? '--';
  const hboxVal = current.h_box != null && current.h_box >= 0 ? Number(current.h_box) : null;
  const hbox = hboxVal != null ? hboxVal.toFixed(1) : '--';
  const dewPoint = hboxVal != null && typeof current.t_box === 'number'
    ? calculateDewPoint(current.t_box, hboxVal)
    : null;
  const isCondenseRisk = (hboxVal != null && hboxVal > 80) || (dewPoint != null && typeof current.t_box === 'number' && (current.t_box - dewPoint) <= 2.0);
  const humStatus = hboxVal == null
    ? { label: 'N/D', cls: 'text-slate-400 bg-slate-700/40' }
    : isCondenseRisk
      ? { label: 'Rischio Condensa', cls: 'text-red-400 bg-red-400/10' }
      : hboxVal >= 65
        ? { label: 'Moderata', cls: 'text-amber-400 bg-amber-400/10' }
        : { label: 'Ottimale', cls: 'text-emerald-400 bg-emerald-400/10' };

  const isCutNow = current.is_load_cut === 1 || current.is_load_cut === true;
  const avgPwmPct = summary.avg_load_pwm != null ? Math.round(Number(summary.avg_load_pwm) * 100) : 0;
  const cutCount = summary.load_cut_count || 0;

  const rssi = current.rssi ?? '--';
  const anomalies = summary.anomaly_count || 0;

  return (
    <div className="p-4 flex flex-col gap-6 pb-24">
      <header className="mt-2">
        <h1 className="text-2xl font-bold">Diagnostica</h1>
        <p className="text-slate-400 text-sm">Salute del sistema e Hardware</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {/* Temperatura */}
        <div className="flex flex-col p-4 bg-slate-800 rounded-2xl border border-slate-700 gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/20 p-3 rounded-full"><Thermometer className="w-8 h-8 text-orange-400"/></div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Temperatura Quadretto</p>
              <div className="flex justify-between items-baseline">
                <p className="text-2xl font-bold">{tbox} <span className="text-sm font-normal">°C</span></p>
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Attuale</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg text-sm flex flex-col gap-1 border border-slate-700/50">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">Picco Massimo:</span>
              <span className="text-orange-400 font-bold">{stats.tboxMax} °C <span className="text-slate-500 font-normal text-xs ml-1">({stats.tboxMaxTime})</span></span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Picco Minimo:</span>
              <span className="text-sky-400 font-bold">{stats.tboxMin} °C <span className="text-slate-500 font-normal text-xs ml-1">({stats.tboxMinTime})</span></span>
            </div>
          </div>
        </div>

        {/* Umidità & Punto di Rugiada */}
        <div className="flex flex-col p-4 bg-slate-800 rounded-2xl border border-slate-700 gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500/20 p-3 rounded-full"><Droplets className="w-8 h-8 text-cyan-400"/></div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Umidità Quadretto</p>
              <div className="flex justify-between items-baseline">
                <p className="text-2xl font-bold">{hbox} <span className="text-sm font-normal">%</span></p>
                <span className={`text-xs px-2 py-1 rounded ${humStatus.cls}`}>{humStatus.label}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg text-sm flex flex-col gap-1 border border-slate-700/50">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">Picco Massimo:</span>
              <span className="text-cyan-400 font-bold">{stats.hboxMax} % <span className="text-slate-500 font-normal text-xs ml-1">({stats.hboxMaxTime})</span></span>
            </div>
            <div className="flex justify-between border-b border-slate-800 py-1">
              <span className="text-slate-400">Picco Minimo:</span>
              <span className="text-sky-400 font-bold">{stats.hboxMin} % <span className="text-slate-500 font-normal text-xs ml-1">({stats.hboxMinTime})</span></span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Punto di Rugiada:</span>
              <span className={`font-bold ${isCondenseRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                {dewPoint != null ? `${dewPoint.toFixed(1)} °C` : '-- °C'}
              </span>
            </div>
          </div>
        </div>

        {/* Supervisore Smart Load (LVD) */}
        <div className="flex flex-col p-4 bg-slate-800 rounded-2xl border border-slate-700 gap-3">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isCutNow ? 'bg-red-500/20' : 'bg-purple-500/20'}`}>
              <Lightbulb className={`w-8 h-8 ${isCutNow ? 'text-red-400' : 'text-purple-400'}`}/>
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Supervisore Smart Load (LVD)</p>
              <div className="flex justify-between items-baseline">
                <p className={`text-xl font-bold ${isCutNow ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isCutNow ? 'In Cut-off LVD' : 'Attivo / Protetto'}
                </p>
                <span className="text-xs text-purple-300 bg-purple-400/10 px-2 py-1 rounded">
                  Media {avgPwmPct}%
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg text-sm flex flex-col gap-1 border border-slate-700/50">
            <div className="flex justify-between">
              <span className="text-slate-400">Interventi Cut-off Oggi:</span>
              <span className={`font-bold ${cutCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {cutCount} slot ({cutCount * 10} min)
              </span>
            </div>
          </div>
        </div>

        {/* Segnale Wi-Fi */}
        <div className="flex flex-col p-4 bg-slate-800 rounded-2xl border border-slate-700 gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-sky-500/20 p-3 rounded-full"><Wifi className="w-8 h-8 text-sky-400"/></div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Potenza Segnale Wi-Fi</p>
              <div className="flex justify-between items-baseline">
                <p className="text-2xl font-bold">{rssi} <span className="text-sm font-normal">dBm</span></p>
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Attuale</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg text-sm flex flex-col gap-1 border border-slate-700/50">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">Miglior Segnale:</span>
              <span className="text-emerald-400 font-bold">{stats.rssiMax} dBm <span className="text-slate-500 font-normal text-xs ml-1">({stats.rssiMaxTime})</span></span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Peggior Segnale:</span>
              <span className="text-sky-400 font-bold">{stats.rssiMin} dBm <span className="text-slate-500 font-normal text-xs ml-1">({stats.rssiMinTime})</span></span>
            </div>
          </div>
        </div>

        {/* Anomalie */}
        <div className="flex flex-col p-4 bg-slate-800 rounded-2xl border border-slate-700 gap-3">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${anomalies > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
              {anomalies > 0 ? <ShieldAlert className="w-8 h-8 text-red-400"/> : <ShieldCheck className="w-8 h-8 text-emerald-400"/>}
            </div>
            <div>
              <p className="text-slate-400 text-sm">Letture Corrotte (Sensore)</p>
              <p className={`text-2xl font-bold ${anomalies > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{anomalies} <span className="text-sm font-normal">Scartate oggi</span></p>
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-lg text-xs text-slate-400 border border-slate-700/50">
            Indica quante volte i sensori INA226 hanno inviato dati matematicamente impossibili (es. cavo scollegato o sbalzi) che il sistema ha bloccato e scartato.
          </div>
          {corruptedLog.length > 0 && (
            <div className="mt-3 p-3 bg-slate-900/80 rounded-lg text-xs font-mono text-red-300 overflow-x-auto border border-red-900/30">
              <p className="text-slate-400 mb-2 font-sans">Log dati scartati:</p>
              {corruptedLog.map((log, i) => (
                <div key={i} className="mb-2 pb-2 border-b border-red-900/30 last:border-0 last:mb-0 last:pb-0">
                  <span className="text-red-400 font-bold">{new Date(log.datetime_local).toLocaleTimeString('it-IT')}</span>
                  <br/>
                  V_PAN: {log.v_pan}V | I_PAN: {log.i_pan}A | W_PAN: {log.w_pan}W
                  <br/>
                  V_BAT: {log.v_bat}V | I_BAT: {log.i_bat}A | W_BAT: {log.w_bat}W
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
          <h3 className="text-slate-400 text-sm mb-4">Informazioni Sistema</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Versione Firmware (Box)</span>
              <span className="text-emerald-400 font-mono text-sm">{data?.fwVer || '--'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Versione App (Frontend)</span>
              <span className="text-slate-200 font-mono text-sm">{__APP_VERSION__}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Versione API (Backend)</span>
              <span className="text-slate-200 font-mono text-sm">{apiVersion}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
          <h3 className="text-slate-400 text-sm mb-4">Aggiornamento Dati</h3>
          <div className="text-sm text-slate-300 space-y-2">
            <p>Il Sensore (Box) invia i dati al Cloud (Adafruit) in tempo reale.</p>
            <p>Il nostro Server Cloudflare scarica e salva questi dati <strong>automaticamente ogni 15 minuti</strong> (via Cron Job).</p>
            <p className="text-emerald-400 mt-2">💡 <strong>Consiglio:</strong> Puoi forzare il download immediato dei dati dal sensore in qualsiasi momento premendo il tasto "Aggiorna" in alto a destra nella schermata "Oggi".</p>
          </div>
        </div>

      </div>
    </div>
  );
}
