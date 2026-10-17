import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Legend, Brush, Line } from 'recharts';
import { ArrowLeft, Zap, Battery, Cloud, Sun, BatteryCharging, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useContainerWidth, useChartFullscreen } from '../hooks/useContainerWidth';
import { buildChartSeriesWithGaps, getResponsiveTicks, formatMinutesToHHMM } from '../utils/chartTimeHelpers';
import { TouchTraveller, CompactChartHud } from '../components/TouchTraveller';

const LATITUDE = 44.95; // Default Vinovo (TO) se non impostato
const LONGITUDE = 7.64;

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

export default function HistoryView() {
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { isFullscreen, isLandscape, viewportHeight, toggleFullscreen } = useChartFullscreen();
  const [brushKey, setBrushKey] = useState(0);
  const [hoverData, setHoverData] = useState<any>(null);
  const [brushRange, setBrushRange] = useState<any>(null);
  const [visible, setVisible] = useState({ w_pan: true, w_bat_charge: true, w_bat_discharge: true, sun_elevation: true });
  const { ref: chartContainerRef, width: containerWidth } = useContainerWidth();

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
    setBrushRange(null);
    setHoverData(null);
    try {
      const settingsRes = await api.getSettings().catch(() => null);
      const lat = settingsRes?.settings?.latitude ?? LATITUDE;
      const lon = settingsRes?.settings?.longitude ?? LONGITUDE;

      const res = await api.getHistoryDay(date);
      const { chartData: formattedChart, peakTime, maxW, minW } = buildChartSeriesWithGaps(
        res.chartData || [],
        lat,
        lon
      );
      
      const roughStepL = (maxW - minW) / 5;
      const mag = Math.pow(10, Math.floor(Math.log10(roughStepL || 1)));
      let stepL = Math.ceil(roughStepL / mag) * mag;
      if (stepL === 3 * mag || stepL === 4 * mag) stepL = 5 * mag;
      else if (stepL === 6 * mag || stepL === 7 * mag || stepL === 8 * mag || stepL === 9 * mag) stepL = 10 * mag;

      let L_max = Math.ceil(maxW / stepL) * stepL;
      let L_min = Math.floor(minW / stepL) * stepL;
      
      const posTicks = Math.round(L_max / stepL) || 1;
      const negTicks = Math.round(Math.abs(L_min) / stepL);
      
      const stepR = 90 / posTicks;

      const leftTicks = [];
      for(let i = -negTicks; i <= posTicks; i++) leftTicks.push(Number((i * stepL).toFixed(2)));
      
      const rightTicks = [];
      for(let i = -negTicks; i <= posTicks; i++) rightTicks.push(Number((i * stepR).toFixed(2)));

      setDayDetails({ summary: res.summary || {}, chart: formattedChart, peakTime, leftTicks, rightTicks, L_min, L_max, R_min: rightTicks[0], R_max: rightTicks[rightTicks.length-1] });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-center mt-10">Caricamento storico...</div>;
  if (selectedDate && !dayDetails) return <div className="p-4 text-center mt-10">Caricamento dettagli giornata...</div>;

  if (selectedDate && dayDetails) {
    let summary = dayDetails.summary || {};
    const chartData = dayDetails.chart || [];
    let peakTime = dayDetails.peakTime || '--:--';
    let isSelection = false;

    if (brushRange && brushRange.startIndex !== undefined && brushRange.endIndex !== undefined && chartData.length > 0) {
      if (brushRange.startIndex > 0 || brushRange.endIndex < chartData.length - 1) {
        isSelection = true;
        const slice = chartData.slice(brushRange.startIndex, brushRange.endIndex + 1);
        
        let wh_produced = 0;
        let wh_battery_charge = 0;
        let wh_battery_discharge = 0;
        let peak_power_w = 0;
        
        slice.forEach((d: any) => {
          if (d.w_pan) wh_produced += d.w_pan / 6.0;
          if (d.w_bat_charge) wh_battery_charge += d.w_bat_charge / 6.0;
          if (d.w_bat_discharge) wh_battery_discharge += Math.abs(d.w_bat_discharge) / 6.0;
          if ((d.w_pan || 0) > peak_power_w) {
            peak_power_w = d.w_pan;
            peakTime = d.time;
          }
        });
        
        summary = {
          ...summary,
          wh_produced,
          wh_battery_charge,
          wh_battery_discharge,
          peak_power_w
        };
      }
    }

    const lastValidRecord = chartData && chartData.length > 0
      ? [...chartData].reverse().find((d: any) => !d.is_gap) || chartData[chartData.length - 1]
      : null;
    const xTicks = getResponsiveTicks(chartData, containerWidth, brushRange);
    const isLandscapeSplit = isLandscape && (isFullscreen || viewportHeight < 540);
    const isMobile = containerWidth < 640 || isLandscapeSplit;
    const brushHeight = isLandscapeSplit ? 28 : isMobile ? 42 : 32;
    const travellerWidth = isMobile ? 28 : 14;
    const zoomStartTime = isSelection && chartData[brushRange.startIndex] ? chartData[brushRange.startIndex].time : null;
    const zoomEndTime = isSelection && chartData[brushRange.endIndex] ? chartData[brushRange.endIndex].time : null;

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
              <p className="text-sm text-slate-400">Pannello ({isSelection ? 'Selezione' : 'Totale'})</p>
              <p className="text-2xl font-bold text-yellow-400 text-lg">{Math.round(summary.wh_produced || 0)} <span className="text-sm font-normal text-slate-300">Wh</span></p>
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
              <p className="text-sm text-slate-400">Picco Solare {isSelection ? '(Selezione)' : ''}</p>
              <p className="text-2xl font-bold text-orange-400">{Math.round(summary.peak_power_w || 0)} <span className="text-sm font-normal text-slate-300">W</span></p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 flex items-center justify-between">
                <span>Registrato alle:</span> 
                <span className="font-bold text-slate-300 text-lg">{peakTime}</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
            <div>
              <BatteryCharging className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-sm text-slate-400">Batteria ({isSelection ? 'Selezione' : 'Erogata'})</p>
              <p className="text-2xl font-bold text-red-400">{Math.round(summary.wh_battery_discharge || 0)} <span className="text-sm font-normal text-slate-300">Wh <span className="text-xs">(Erogata)</span></span></p>
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

        <div className={isFullscreen ? "fixed inset-0 z-[60] bg-slate-900 p-2.5 flex flex-col" : "bg-slate-800 p-4 rounded-2xl border border-slate-700 mt-2 flex flex-col"}>
          <div className="flex justify-between items-center mb-1.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm text-slate-400">Curva Solare (W)</h2>
              {zoomStartTime && zoomEndTime && (
                <span className="text-[11px] font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                  {zoomStartTime} ➔ {zoomEndTime}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setBrushKey(k => k + 1); setBrushRange(null); }} className="text-xs text-slate-400 hover:text-white bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700">
                Reset Zoom
              </button>
              <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-lg border border-slate-700">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className={`flex-1 min-h-0 flex ${isLandscapeSplit ? 'flex-row gap-2.5 items-stretch' : 'flex-col'}`}>
            <div
              ref={chartContainerRef}
              className={`touch-none ${
                isFullscreen
                  ? 'flex-1 min-w-0 min-h-0'
                  : isLandscapeSplit
                    ? 'flex-1 min-w-0 h-[280px]'
                    : 'h-[400px] md:h-[520px]'
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={brushKey} data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    type="number"
                    dataKey="timeMin"
                    domain={['dataMin', 'dataMax']}
                    ticks={xTicks}
                    tickFormatter={formatMinutesToHHMM}
                    niceTicks="none"
                    interval={0}
                    stroke="#475569"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis yAxisId="left" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} ticks={dayDetails.leftTicks} domain={[dayDetails.L_min || 0, dayDetails.L_max || 10]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#fb923c" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}°`} ticks={dayDetails.rightTicks} domain={[dayDetails.R_min || 0, dayDetails.R_max || 90]} hide={!visible.sun_elevation} />
                  <Tooltip content={<SyncTooltip setHoverData={setHoverData} />} cursor={{stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3'}} />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8', cursor: 'pointer', paddingBottom: '4px' }} onClick={handleLegendClick} />
                  <Area yAxisId="left" hide={!visible.w_pan} type="monotone" dataKey="w_pan" name={isMobile ? "Solare" : "Solare [W]"} stroke={visible.w_pan ? "#facc15" : "#475569"} fill="#facc15" fillOpacity={0.2} strokeWidth={3} connectNulls={false} />
                  <ReferenceLine yAxisId="left" y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Area yAxisId="left" hide={!visible.w_bat_charge} type="monotone" dataKey="w_bat_charge" name={isMobile ? "Ricarica" : "Batt. in Ricarica [W]"} stroke={visible.w_bat_charge ? "#10b981" : "#475569"} fill="#10b981" fillOpacity={0.2} strokeWidth={3} connectNulls={false} />
                  <Area yAxisId="left" hide={!visible.w_bat_discharge} type="monotone" dataKey="w_bat_discharge" name={isMobile ? "Scarica" : "Batt. in Scarica [W]"} stroke={visible.w_bat_discharge ? "#ef4444" : "#475569"} fill="#ef4444" fillOpacity={0.2} strokeWidth={3} connectNulls={false} />
                  <Line yAxisId="right" hide={!visible.sun_elevation} type="monotone" dataKey="sun_elevation" name={isMobile ? "Sole [°]" : "Elevazione Sole [°]"} stroke={visible.sun_elevation ? "#fb923c" : "#475569"} strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls={true} />
                  <Brush
                    dataKey="time"
                    height={brushHeight}
                    travellerWidth={travellerWidth}
                    traveller={<TouchTraveller />}
                    stroke="#64748b"
                    fill="#0f172a"
                    onChange={(e) => setBrushRange(e)}
                  >
                    <AreaChart data={chartData}>
                      <Area
                        type="monotone"
                        dataKey="w_pan"
                        stroke="#facc15"
                        fill="#facc15"
                        fillOpacity={0.25}
                        strokeWidth={1}
                        connectNulls={false}
                      />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Scheda Dati Interattiva (a destra in Landscape, sotto in Portrait) */}
            <CompactChartHud
              displayData={hoverData || lastValidRecord}
              layout={isLandscapeSplit ? 'sidebar' : 'bottom'}
            />
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





















