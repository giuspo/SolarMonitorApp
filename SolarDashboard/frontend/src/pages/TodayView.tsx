import React, { useState, useEffect } from 'react';
import { LogOut, Zap, Battery, Cloud, RefreshCw, Sun, BatteryCharging, Maximize2, Minimize2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Brush } from 'recharts';
import { api } from '../services/api';


function SyncTooltip({ active, payload, setHoverData }: any) {
  React.useEffect(() => {
    if (active && payload && payload.length > 0) {
      setHoverData(payload[0].payload);
    } else {
      setHoverData(null);
    }
  }, [active, payload, setHoverData]);
  return null;
}

export default function TodayView({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [brushKey, setBrushKey] = useState(0);
  const [hoverData, setHoverData] = useState<any>(null);
  const [visible, setVisible] = useState({ w_pan: true, w_bat_charge: true, w_bat_discharge: true });

  const loadData = async () => {
    try {
      const res = await api.getToday();
      
      let peakTime = '--:--';
      let maxW = -1;

      const formattedChart = (res.chartData || []).filter((d: any) => d.is_valid !== 0 && d.is_valid !== false).map((d: any) => {
        const time = new Date(d.datetime_local).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        if (d.w_pan !== undefined && d.w_pan !== null && Number(d.w_pan) > maxW) {
            maxW = Number(d.w_pan);
            peakTime = time;
        }

        const w_bat_charge = d.i_bat < 0 ? Math.abs(d.w_bat) : 0;
        const w_bat_discharge = d.i_bat > 0 ? -Math.abs(d.w_bat) : 0;
        return { ...d, time, w_bat_charge, w_bat_discharge };
      });
      setData({ summary: res.summary || {}, chart: formattedChart, peakTime });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    setVisible(prev => ({ ...prev, [dataKey]: !(prev as any)[dataKey] }));
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.syncData();
      await loadData();
    } catch (err) {
      alert('Errore durante la sincronizzazione');
    }
    setSyncing(false);
  };

  if (loading) return <div className="p-4 text-center mt-10">Caricamento dati dal sensore...</div>;

  const summary = data?.summary || {};
  const chartData = data?.chart || [];
  const peakTime = data?.peakTime || '--:--';

  return (
    <div className="p-4 flex flex-col gap-6 pb-24">
      <header className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl ring-1 ring-amber-400/30 object-cover shadow-md" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Oggi</h1>
            <p className="text-slate-400 text-xs font-medium">Solar Monitor Box</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing} className="p-2 bg-slate-800 rounded-full text-slate-300">
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button onClick={onLogout} className="p-2 bg-slate-800 rounded-full text-slate-300">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Energia Totale Pannello */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div>
            <Sun className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-sm text-slate-400">Pannello (Totale Oggi)</p>
            <p className="text-2xl font-bold text-yellow-400 text-lg">{Math.round(summary.wh_produced || 0)} <span className="text-sm font-normal text-slate-300">Wh</span></p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 flex items-center justify-between">
              <span>Meteo Medio:</span> 
              <span className="font-bold text-sky-400">{summary.avg_cloud ? Math.round(summary.avg_cloud * 100) : '--'}% <Cloud className="w-3 h-3 inline ml-0.5" /></span>
            </p>
          </div>
        </div>

        {/* Card 2: Picco Pannello */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div>
            <Zap className="w-6 h-6 text-orange-400 mb-2" />
            <p className="text-sm text-slate-400">Picco Solare</p>
            <p className="text-2xl font-bold text-orange-400">{Math.round(summary.peak_power_w || 0)} <span className="text-sm font-normal text-slate-300">W</span></p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 flex items-center justify-between">
              <span>Registrato alle:</span> 
              <span className="font-bold text-slate-300 text-lg">{peakTime}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Energia Batteria */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div>
            <BatteryCharging className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-sm text-slate-400">Batteria (Erogata)</p>
            <p className="text-2xl font-bold text-red-400">{Math.round(summary.wh_battery_discharge || 0)} <span className="text-sm font-normal text-slate-300">Wh</span></p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 flex items-center justify-between">
              <span>Ricaricata:</span> 
              <span className="font-bold text-emerald-400">{Math.round(summary.wh_battery_charge || 0)} Wh</span>
            </p>
          </div>
        </div>

        {/* Card 4: Tensione Batteria */}
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
          <div>
            <Battery className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-sm text-slate-400">Tensione (Max)</p>
            <p className="text-2xl font-bold text-emerald-400">{summary.v_bat_max ? summary.v_bat_max.toFixed(2) : '--'} <span className="text-sm font-normal text-slate-300">V</span></p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 flex items-center justify-between">
              <span>Minima:</span> 
              <span className="font-bold text-sky-400">{summary.v_bat_min ? summary.v_bat_min.toFixed(2) : '--'} V</span>
            </p>
          </div>
        </div>
      </div>

      <div className={isFullscreen ? "fixed inset-0 z-[60] bg-slate-900 p-4 flex flex-col" : "bg-slate-800 p-4 rounded-2xl border border-slate-700 mt-2 flex flex-col"}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm text-slate-400">Curva Solare (W)</h2>
          <div className="flex gap-2">
            <button onClick={() => setBrushKey(k => k + 1)} className="text-xs text-slate-400 hover:text-white bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700">
              Reset Zoom
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-lg border border-slate-700">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* HUD Container for live data instead of floating tooltip */}
        
        <div className={`touch-none ${isFullscreen ? 'flex-1 min-h-0' : 'h-[300px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart key={brushKey} data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<SyncTooltip setHoverData={setHoverData} />} cursor={{stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3'}} />
              <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }} onClick={handleLegendClick} />
              <Area hide={!visible.w_pan} type="monotone" dataKey="w_pan" name="Solare [W]" stroke={visible.w_pan ? "#facc15" : "#475569"} fill="#facc15" fillOpacity={0.2} strokeWidth={2} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Area hide={!visible.w_bat_charge} type="monotone" dataKey="w_bat_charge" name="Batt. in Ricarica [W]" stroke={visible.w_bat_charge ? "#10b981" : "#475569"} fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area hide={!visible.w_bat_discharge} type="monotone" dataKey="w_bat_discharge" name="Batt. in Scarica [W]" stroke={visible.w_bat_discharge ? "#ef4444" : "#475569"} fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              <Brush dataKey="time" height={30} stroke="#64748b" fill="#0f172a" travellerWidth={12} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Tabella Dati Interattiva */}
        {(() => {
          const displayData = hoverData || (chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null);
          if (!displayData) return null;
          return (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/80 rounded-xl border border-slate-700 p-3">
              <div className="flex flex-col">
                <span className="text-slate-400 text-sm uppercase tracking-wider">Orario Rilevamento</span>
                <span className="font-bold text-slate-200 text-lg">{displayData.time}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-sm uppercase tracking-wider">☀️ Pannello</span>
                <span className="font-bold text-yellow-400 text-lg">{displayData.w_pan?.toFixed(1) ?? '--'} W <span className="text-sm text-slate-400 font-normal">({displayData.v_pan?.toFixed(1)}V • {displayData.i_pan?.toFixed(1)}A)</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-sm uppercase tracking-wider">🔋 Batteria</span>
                <span className={`font-bold ${displayData.i_bat < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {Math.abs(displayData.w_bat || 0).toFixed(1)} W <span className="text-sm text-slate-400 font-normal">({displayData.v_bat?.toFixed(1)}V • {displayData.i_bat?.toFixed(1)}A)</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-sm uppercase tracking-wider">🌡️ Meteo & Box</span>
                <span className="font-bold text-slate-300 text-lg">
                  {displayData.t_box?.toFixed(1)}°C <span className="text-sm text-slate-400 font-normal">({displayData.cloud >= 0 ? Math.round(displayData.cloud * 100) : '--'}% Nuvole)</span>
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

























