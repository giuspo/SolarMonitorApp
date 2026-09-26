import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Settings, Sun, Home, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length >= 2) {
    const importVal = payload.find((p: any) => p.dataKey === 'import')?.value || 0;
    const savingsVal = payload.find((p: any) => p.dataKey === 'savings')?.value || 0;
    const total = (importVal + savingsVal).toFixed(2);
    
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-slate-300 mb-2">Giorno {label}</p>
        <div className="border-b border-slate-700 pb-2 mb-2">
          <p className="text-emerald-400">Autoproduzione (Gratis): {savingsVal} kWh</p>
          <p className="text-red-400">Prelevata da Enel: {importVal} kWh</p>
        </div>
        <p className="text-white font-semibold">Consumo Totale Casa: {total} kWh</p>
      </div>
    );
  }
  return null;
};

export default function SimulatorView() {
  const [simMode, setSimMode] = useState<'daily' | 'monthly' | 'range'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // Simulation Parameters
  const [panelPowerW, setPanelPowerW] = useState(800);
  const [batteryCapacityWh, setBatteryCapacityWh] = useState(1000);
  const [energyPrice, setEnergyPrice] = useState(0.25);
  const [systemCost, setSystemCost] = useState(800);
  const [consMattinoW, setConsMattinoW] = useState(150);
  const [consPomeriggioW, setConsPomeriggioW] = useState(150);
  const [consSeraW, setConsSeraW] = useState(250);
  const [consNotteW, setConsNotteW] = useState(100);

  // Results
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    api.getHistory().then(res => {
      const dates = (res.history || []).map((h: any) => h.date);
      setAvailableDates(dates);
      
      const months = Array.from(new Set(dates.map((d: string) => d.substring(0, 7)))).sort().reverse();
      setAvailableMonths(months as string[]);

      if (dates.length > 0) {
        setSelectedDate(dates[0]);
      }
      if (months.length > 0) {
        setSelectedMonth(months[0] as string);
      }
      if (dates.length > 0) {
        setEndDate(dates[0]); // latest date
        setStartDate(dates[dates.length - 1]); // earliest date
      }
      setLoading(false);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (simMode === 'daily' && selectedDate) {
      setSimulating(true);
      api.getHistoryDay(selectedDate).then(res => {
        setRawRecords(res.chartData || []);
        setSimulating(false);
      }).catch(console.error);
    } else if (simMode === 'monthly' && selectedMonth) {
      setSimulating(true);
      api.getHistoryMonth(selectedMonth).then(res => {
        setRawRecords(res.data || []);
        setSimulating(false);
      }).catch(console.error);
    } else if (simMode === 'range' && startDate && endDate) {
      setSimulating(true);
      api.getHistoryRange(startDate, endDate).then(res => {
        setRawRecords(res.data || []);
        setSimulating(false);
      }).catch(console.error);
    }
  }, [simMode, selectedDate, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (rawRecords.length === 0 && !simulating) return;
    runSimulation();
  }, [rawRecords, panelPowerW, batteryCapacityWh, energyPrice, systemCost, consMattinoW, consPomeriggioW, consSeraW, consNotteW, simMode]);

  const runSimulation = () => {
    const multiplier = panelPowerW / 10;
    let currentBatWh = 0; // Starts empty even for month (realistic for day 1)
    
    let totalProdWh = 0;
    let totalDirectConsWh = 0;
    let totalBatDischargeWh = 0;
    let totalGridImportWh = 0;
    let totalGridExportWh = 0;

    const chart: any[] = [];
    const monthlySummary: Record<string, any> = {};
    const dailyStats: Record<string, any> = {};

    if (rawRecords.length === 0) {
      setResults(null);
      return;
    }

    const processPoint = (timeObj: Date, sim_w_pan: number, dtHours: number) => {
      if (isNaN(timeObj.getTime()) || isNaN(dtHours)) return;
      const hour = timeObj.getHours();
      let sim_w_cons = 0;
      if (hour >= 6 && hour < 12) sim_w_cons = consMattinoW;
      else if (hour >= 12 && hour < 18) sim_w_cons = consPomeriggioW;
      else if (hour >= 18 && hour < 24) sim_w_cons = consSeraW;
      else sim_w_cons = consNotteW;
      
      const prod_wh = sim_w_pan * dtHours;
      const cons_wh = sim_w_cons * dtHours;
      
      totalProdWh += prod_wh;

      let w_net = sim_w_pan - sim_w_cons;
      let net_wh = w_net * dtHours;
      
      let curDirect = 0;
      let curBatDischarge = 0;
      let curGridImport = 0;
      
      const dayKeyStr = timeObj.toISOString().substring(5, 10);
      if (!dailyStats[dayKeyStr]) dailyStats[dayKeyStr] = { surplus: 0, deficit: 0, maxBat: 0 };

      if (net_wh >= 0) {
        dailyStats[dayKeyStr].surplus += net_wh;
        curDirect = cons_wh;
        totalDirectConsWh += cons_wh;
        const spaceInBat = batteryCapacityWh - currentBatWh;
        if (net_wh <= spaceInBat) {
          currentBatWh += net_wh;
        } else {
          currentBatWh = batteryCapacityWh;
          totalGridExportWh += (net_wh - spaceInBat);
        }
      } else {
        dailyStats[dayKeyStr].deficit += Math.abs(net_wh);
        curDirect = prod_wh;
        totalDirectConsWh += prod_wh;
        const deficit = Math.abs(net_wh);
        if (currentBatWh >= deficit) {
          currentBatWh -= deficit;
          curBatDischarge = deficit;
          totalBatDischargeWh += deficit;
        } else {
          curBatDischarge = currentBatWh;
          totalBatDischargeWh += currentBatWh;
          curGridImport = (deficit - currentBatWh);
          totalGridImportWh += curGridImport;
          currentBatWh = 0;
        }
      }
      
      dailyStats[dayKeyStr].maxBat = Math.max(dailyStats[dayKeyStr].maxBat, currentBatWh);

      if (simMode === 'daily') {
        chart.push({
          time: timeObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          w_pan: Math.round(sim_w_pan),
          w_cons: Math.round(sim_w_cons),
          bat_soc: batteryCapacityWh > 0 ? Math.round((currentBatWh / batteryCapacityWh) * 100) : 0
        });
      } else {
        const dayKey = timeObj.toISOString().substring(5, 10);
        if (!monthlySummary[dayKey]) {
          monthlySummary[dayKey] = { date: dayKey, savingsWh: 0, importWh: 0 };
        }
        monthlySummary[dayKey].savingsWh += (curDirect + curBatDischarge);
        monthlySummary[dayKey].importWh += curGridImport;
      }
    };

    let firstTimeStr = rawRecords[0].datetime_local || '';
    if (firstTimeStr.includes(' ')) firstTimeStr = firstTimeStr.replace(' ', 'T');
    let lastTime = new Date(firstTimeStr).getTime();

    // Process real data
    rawRecords.forEach(r => {
      let timeStr = r.datetime_local || '';
      if (timeStr.includes(' ')) timeStr = timeStr.replace(' ', 'T');
      const timeObj = new Date(timeStr);
      const currTime = timeObj.getTime();
      let dtHours = (currTime - lastTime) / 3600000;
      if (dtHours > 1) dtHours = 0; // ignore massive gaps
      lastTime = currTime;
      
      processPoint(timeObj, (r.w_pan || 0) * multiplier, dtHours);
    });

    if (simMode === 'daily') {
      // Pad until end of day (23:50) so the graph always shows 24h
      const lastRecordDate = new Date(lastTime);
      let padTime = lastRecordDate.getTime() + (10 * 60000); // add 10 mins
      const endOfDay = new Date(lastRecordDate);
      endOfDay.setHours(23, 50, 0, 0);

      while (padTime <= endOfDay.getTime()) {
        processPoint(new Date(padTime), 0, 10 / 60);
        padTime += 10 * 60000;
      }
    } else {
      // Monthly mode: convert monthlySummary object to array chart
      Object.keys(monthlySummary).forEach(day => {
         chart.push({
           date: day,
           savings: Number((monthlySummary[day].savingsWh / 1000).toFixed(2)),
           import: Number((monthlySummary[day].importWh / 1000).toFixed(2))
         });
      });
    }

    const totalHouseWh = totalDirectConsWh + totalBatDischargeWh + totalGridImportWh;
    const independence = totalHouseWh > 0 ? ((totalDirectConsWh + totalBatDischargeWh) / totalHouseWh) * 100 : 0;
    const moneySaved = ((totalDirectConsWh + totalBatDischargeWh) / 1000) * energyPrice;
    
    const numDays = simMode === 'daily' ? 1 : Object.keys(monthlySummary).length;
    const dailySavings = moneySaved / (numDays || 1);
    const yearlySavings = dailySavings * 365;
    const paybackYears = yearlySavings > 0 ? systemCost / yearlySavings : 0;
    
    let idealBatSum = 0;
    let maxBatSum = 0;
    let daysCount = 0;
    Object.values(dailyStats).forEach((s: any) => {
      idealBatSum += Math.min(s.surplus, s.deficit);
      maxBatSum += s.maxBat;
      daysCount++;
    });
    
    const suggestedBatWh = daysCount > 0 ? (idealBatSum / daysCount) : 0;
    const avgMaxBat = daysCount > 0 ? (maxBatSum / daysCount) : 0;
    
    let batStatus = "Non presente";
    if (batteryCapacityWh > 0) {
       const roundedIdeal = Math.round(suggestedBatWh / 100) * 100;
       
       if (batteryCapacityWh >= roundedIdeal + 300) {
          batStatus = "Sovradimensionata (una batteria più piccola sarebbe sufficiente)";
       } else if (batteryCapacityWh <= roundedIdeal - 300) {
          batStatus = "Sottodimensionata (sprechi energia che potresti stoccare)";
       } else {
          batStatus = "Equilibrata (capacità in linea con produzione e consumi)";
       }
    }

    setResults({
      chart,
      totals: {
        prod: totalProdWh / 1000,
        direct: totalDirectConsWh / 1000,
        battery: totalBatDischargeWh / 1000,
        import: totalGridImportWh / 1000,
        export: totalGridExportWh / 1000,
        savings: (totalDirectConsWh + totalBatDischargeWh) / 1000,
        independence,
        moneySaved,
        paybackYears,
        suggestedBatWh,
        batStatus
      }
    });
  };

  if (loading && availableDates.length === 0) return <div className="p-4 text-center mt-10">Caricamento storico...</div>;

  return (
    <div className="p-4 flex flex-col gap-6 pb-24">
      <header className="mt-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Simulatore</h1>
          <p className="text-slate-400 text-sm">Proietta impianto reale</p>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button 
            onClick={() => setSimMode('daily')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${simMode === 'daily' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
          >Giorno</button>
          <button 
            onClick={() => setSimMode('monthly')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${simMode === 'monthly' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
          >Mese</button>
          <button 
            onClick={() => setSimMode('range')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${simMode === 'range' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
          >Periodo</button>
        </div>
      </header>

      {/* Pannello Parametri */}
      <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-sky-400" />
          <h2 className="font-bold">Parametri Impianto (Ipotetico)</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {simMode === 'range' ? (
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-xs text-slate-400">Da - A</label>
              <div className="flex gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white w-full" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white w-full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">{simMode === 'daily' ? 'Giorno' : 'Mese'}</label>
              {simMode === 'daily' ? (
                <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none cursor-pointer" style={{ appearance: "none", WebkitAppearance: "none" }}>
                  {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none cursor-pointer" style={{ appearance: "none", WebkitAppearance: "none" }}>
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Pannelli (W)</label>
            <input type="number" value={panelPowerW} onChange={e => setPanelPowerW(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Batteria (Wh)</label>
            <input type="number" value={batteryCapacityWh} onChange={e => setBatteryCapacityWh(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Energia (€/kWh)</label>
            <input type="number" step="0.01" value={energyPrice} onChange={e => setEnergyPrice(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Costo Impianto (€)</label>
            <input type="number" value={systemCost} onChange={e => setSystemCost(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 col-span-2 sm:col-span-5 mt-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase">Mattino (6-12) W</label>
              <input type="number" value={consMattinoW} onChange={e => setConsMattinoW(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white text-center" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase">Pom. (12-18) W</label>
              <input type="number" value={consPomeriggioW} onChange={e => setConsPomeriggioW(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white text-center" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase">Sera (18-24) W</label>
              <input type="number" value={consSeraW} onChange={e => setConsSeraW(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white text-center" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase">Notte (0-6) W</label>
              <input type="number" value={consNotteW} onChange={e => setConsNotteW(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white text-center" />
            </div>
          </div>
        </div>
      </div>

      {simulating ? (
        <div className="text-center text-slate-400 my-10">Esecuzione simulazione massiva...</div>
      ) : results ? (
        <>
          {/* Risultati */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <Sun className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-xs text-slate-400">Produzione {simMode === 'monthly' ? 'Mese' : 'Giorno'}</p>
              <p className="text-xl font-bold text-yellow-400">{results.totals.prod.toFixed(1)} <span className="text-xs font-normal text-slate-300">kWh</span></p>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <ArrowDownToLine className="w-6 h-6 text-sky-400 mb-2" />
              <p className="text-xs text-slate-400">Autoconsumo + Batt.</p>
              <p className="text-xl font-bold text-sky-400">{results.totals.savings.toFixed(1)} <span className="text-xs font-normal text-slate-300">kWh</span></p>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <Home className="w-6 h-6 text-red-400 mb-2" />
              <p className="text-xs text-slate-400">Prelevata da Rete</p>
              <p className="text-xl font-bold text-red-400">{results.totals.import.toFixed(1)} <span className="text-xs font-normal text-slate-300">kWh</span></p>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <ArrowUpFromLine className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-xs text-slate-400">Ceduta / Persa</p>
              <p className="text-xl font-bold text-slate-300">{results.totals.export.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-900/20 p-4 rounded-2xl border border-emerald-500/30 flex flex-col justify-center items-center text-center">
              <p className="text-sm text-emerald-400/80 mb-1">Risparmio ({simMode === 'daily' ? 'Giorno' : 'Periodo'})</p>
              <p className="text-3xl font-bold text-emerald-400">€ {results.totals.moneySaved.toFixed(2)}</p>
            </div>
            <div className="bg-amber-900/20 p-4 rounded-2xl border border-amber-500/30 flex flex-col justify-center items-center text-center">
              <p className="text-sm text-amber-400/80 mb-1">Rientro Investimento</p>
              <p className="text-3xl font-bold text-amber-400">
                {results.totals.paybackYears > 0 && results.totals.paybackYears < 100 ? `${results.totals.paybackYears.toFixed(1)} anni` : 'Mai'}
              </p>
              <p className="text-[10px] text-amber-400/50 mt-1">Proiettato sui dati correnti</p>
            </div>
            <div className="bg-sky-900/20 p-4 rounded-2xl border border-sky-500/30 flex flex-col justify-center items-center text-center">
              <p className="text-sm text-sky-400/80 mb-1">Indipendenza Energetica</p>
              <p className="text-3xl font-bold text-sky-400">{Math.round(results.totals.independence)}%</p>
            </div>
          </div>

          {/* Grafico */}
          {/* AI Advisor Banner */}
          <div className="bg-indigo-900/30 p-4 rounded-2xl border border-indigo-500/50 flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-indigo-300">Intelligenza di Sistema</h3>
                <p className="text-sm text-indigo-200/70">
                  Batteria Attuale: <span className="text-white">{results.totals.batStatus}</span>
                </p>
              </div>
            </div>
            <div className="text-right bg-slate-900/50 p-2 px-4 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Capacità Ideale Consigliata</p>
              <p className="text-2xl font-bold text-white">~ {Math.round(results.totals.suggestedBatWh / 100) * 100} <span className="text-sm font-normal text-slate-400">Wh</span></p>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 h-80 flex flex-col">
            <h2 className="text-sm text-slate-400 mb-4">
              {simMode === 'daily' ? 'Profilo Energetico Stimato' : 'Risparmio vs Consumo (kWh per giorno)'}
            </h2>
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  {simMode === 'daily' ? (
                    <AreaChart data={results.chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="power" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#334155'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                      <Area yAxisId="power" type="monotone" dataKey="w_pan" name="Solare [W]" stroke="#facc15" fill="#facc15" fillOpacity={0.2} strokeWidth={2} />
                      <Area yAxisId="power" type="monotone" dataKey="w_cons" name="Casa [W]" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                      <Area yAxisId="soc" type="monotone" dataKey="bat_soc" name="Batteria [%]" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  ) : (
                    <BarChart data={results.chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155'}} />
                      <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                      <Bar dataKey="savings" name="Autoproduzione" stackId="a" fill="#10b981" />
                      <Bar dataKey="import" name="Rete Enel" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}









