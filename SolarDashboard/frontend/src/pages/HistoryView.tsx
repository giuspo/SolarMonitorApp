import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Legend, Brush } from 'recharts';
import { ArrowLeft, Zap, Battery, Cloud, Sun, BatteryCharging, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import ChartTooltip from '../components/ChartTooltip';

export default function HistoryView() {
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [brushKey, setBrushKey] = useState(0);
  const [showTooltip, setShowTooltip] = useState(true);
  const [visible, setVisible] = useState({ w_pan: true, w_bat_charge: true, w_bat_discharge: true });

  useEffect(() => {
    api.getHistory().then(res => {
      const hist = res.history || [];
      setAllHistory(hist);
      
      if (hist.length > 0) {
        // Find the most recent month
        const latestMonth = hist[0].date.substring(0, 7);
        setSelectedMonth(latestMonth);
      } else {
        const now = new Date();
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      }
      setLoading(false);
    }).catch(console.error);
  }, []);

  // Calculate unique months available in data
  const availableMonths = Array.from(new Set(allHistory.map(h => h.date.substring(0, 7)))).sort().reverse();

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    setVisible(prev => ({ ...prev, [dataKey]: !(prev as any)[dataKey] }));
  };

  const loadDayDetails = async (date: string) => {
    setSelectedDate(date);
    setDayDetails(null);
    try {
      const res = await api.getHistoryDay(date);
      let peakTime = '--:--';
      let maxW = -1;

      const formattedChart = (res.chartData || []).map((d: any) => {
        const time = new Date(d.datetime_local).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        if (d.w_pan !== undefined && d.w_pan !== null && Number(d.w_pan) > maxW) {
            maxW = Number(d.w_pan);
            peakTime = time;
        }

        const w_bat_charge = d.i_bat < 0 ? Math.abs(d.w_bat) : 0;
        const w_bat_discharge = d.i_bat > 0 ? -Math.abs(d.w_bat) : 0;
        return { ...d, time, w_bat_charge, w_bat_discharge };
      });
      setDayDetails({ summary: res.summary || {}, chart: formattedChart, peakTime });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-center mt-10">Caricamento storico...</div>;
  if (selectedDate && !dayDetails) return <div className="p-4 text-center mt-10">Caricamento dettagli giornata...</div>;

  if (selectedDate && dayDetails) {
    const summary = dayDetails.summary || {};
    const chartData = dayDetails.chart || [];
    const peakTime = dayDetails.peakTime || '--:--';

    return (
      <div className="p-4 flex flex-col gap-6 pb-24">
        <header className="flex items-center gap-4 mt-2">
          <button onClick={() => setSelectedDate(null)} className="p-2 bg-slate-800 rounded-full text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{selectedDate}</h1>
            <p className="text-slate-400 text-sm">Dettaglio Giornata</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
            <div>
              <Sun className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-sm text-slate-400">Pannello (Totale)</p>
              <p className="text-2xl font-bold text-yellow-400">{Math.round(summary.wh_produced || 0)} <span className="text-sm font-normal text-slate-300">Wh</span></p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 flex items-center justify-between">
                <span>Meteo Medio:</span> 
                <span className="font-bold text-sky-400">{summary.avg_cloud ? Math.round(summary.avg_cloud * 100) : '--'}% <Cloud className="w-3 h-3 inline ml-0.5" /></span>
              </p>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
            <div>
              <Zap className="w-6 h-6 text-orange-400 mb-2" />
              <p className="text-sm text-slate-400">Picco Solare</p>
              <p className="text-2xl font-bold text-orange-400">{Math.round(summary.peak_power_w || 0)} <span className="text-sm font-normal text-slate-300">W</span></p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 flex items-center justify-between">
                <span>Registrato alle:</span> 
                <span className="font-bold text-slate-300">{peakTime}</span>
              </p>
            </div>
          </div>

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

        <div className={isFullscreen ? "fixed inset-0 z-50 bg-slate-900 p-4 flex flex-col" : "bg-slate-800 p-4 rounded-2xl border border-slate-700 h-80 mt-2 flex flex-col"}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm text-slate-400">Curva Solare (W)</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowTooltip(!showTooltip)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${showTooltip ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white'}`}>
                Popup: {showTooltip ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => setBrushKey(k => k + 1)} className="text-xs text-slate-400 hover:text-white bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700">
                Reset Zoom
              </button>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-lg border border-slate-700">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart key={brushKey} data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              {showTooltip && <Tooltip content={<ChartTooltip />} cursor={{stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3'}} />}
              <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }} onClick={handleLegendClick} />
              <Area hide={!visible.w_pan} type="monotone" dataKey="w_pan" name="Solare [W]" stroke={visible.w_pan ? "#facc15" : "#475569"} fill="#facc15" fillOpacity={0.2} strokeWidth={2} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Area hide={!visible.w_bat_charge} type="monotone" dataKey="w_bat_charge" name="Batt. in Ricarica [W]" stroke={visible.w_bat_charge ? "#10b981" : "#475569"} fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area hide={!visible.w_bat_discharge} type="monotone" dataKey="w_bat_discharge" name="Batt. in Scarica [W]" stroke={visible.w_bat_discharge ? "#ef4444" : "#475569"} fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              <Brush dataKey="time" height={30} stroke="#64748b" fill="#0f172a" travellerWidth={12} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Vista Lista Giornate filtrata per mese
  const filteredHistory = allHistory.filter(h => h.date.startsWith(selectedMonth));
  
  const chartData = [...filteredHistory].reverse().map(h => ({
    date: h.date.substring(8, 10), // only show day number in chart e.g. "26"
    wh_prod: Math.round(h.wh_produced || 0),
    wh_cons: Math.round(h.wh_battery_discharge || 0),
    fullDate: h.date
  }));

  // Helper per navigare i mesi
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (direction === 'prev' && currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  const currentMonthIndex = availableMonths.indexOf(selectedMonth);
  const hasPrev = currentMonthIndex < availableMonths.length - 1;
  const hasNext = currentMonthIndex > 0;
  
  // Format month nice name
  const monthName = selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="p-4 flex flex-col gap-6 pb-24">
      <header className="mt-2 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Storico</h1>
          <p className="text-slate-400 text-sm capitalize">{monthName || 'Mese'}</p>
        </div>
        
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-full border border-slate-700">
            <button 
              onClick={() => handleMonthChange('prev')} 
              disabled={!hasPrev}
              className={`p-1.5 rounded-full ${hasPrev ? 'hover:bg-slate-700 text-white' : 'text-slate-600'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold w-16 text-center">{selectedMonth.substring(5, 7)}/{selectedMonth.substring(2, 4)}</span>
            <button 
              onClick={() => handleMonthChange('next')} 
              disabled={!hasNext}
              className={`p-1.5 rounded-full ${hasNext ? 'hover:bg-slate-700 text-white' : 'text-slate-600'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 w-full h-[60vh] min-h-[400px] flex flex-col">
        <h2 className="text-sm text-slate-400 mb-4">Energia Giornaliera (Tocca una barra per i dettagli)</h2>
        {chartData.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">Nessun dato per questo mese</div>
        ) : (
          <div className="flex-1 w-full relative">
          <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} onClick={(data) => {
              if (data && (data as any).activePayload && (data as any).activePayload.length > 0) {
                loadDayDetails((data as any).activePayload[0].payload.fullDate);
              }
            }}>
              <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#334155'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Bar dataKey="wh_prod" name="Prodotta [Wh]" fill="#facc15" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => loadDayDetails(data.payload.fullDate)} />
              <Bar dataKey="wh_cons" name="Erogata [Wh]" fill="#ef4444" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => loadDayDetails(data.payload.fullDate)} />
            </BarChart>
          </ResponsiveContainer>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}




