export default function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    const isCharging = data.i_bat < 0;
    const isDischarging = data.i_bat > 0;
    let batStatus = 'Inattiva';
    let batColor = 'text-slate-400';
    
    if (isCharging) {
        batStatus = 'Ricarica ⚡';
        batColor = 'text-emerald-400';
    } else if (isDischarging) {
        batStatus = 'Scarica 🔋';
        batColor = 'text-red-400';
    }

    return (
      <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-700 shadow-2xl text-xs backdrop-blur-sm z-50 min-w-[250px]">
        <p className="text-slate-300 font-bold mb-3 text-center text-sm border-b border-slate-700 pb-2">{label}</p>
        
        <div className="flex gap-4 mb-2">
          <div className="flex-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
            <p className="text-yellow-400 font-bold border-b border-slate-700 pb-1 mb-2">Pannello</p>
            <div className="flex justify-between mb-1"><span className="text-slate-400">Watt:</span> <span className="font-mono text-slate-200">{data.w_pan?.toFixed(1) ?? '--'} W</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-400">Volt:</span> <span className="font-mono text-slate-200">{data.v_pan?.toFixed(2) ?? '--'} V</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Amp:</span> <span className="font-mono text-slate-200">{data.i_pan?.toFixed(2) ?? '--'} A</span></div>
          </div>
          
          <div className="flex-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
            <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-2">
                <p className="text-emerald-400 font-bold">Batteria</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 ${batColor}`}>{batStatus}</span>
            </div>
            <div className="flex justify-between mb-1"><span className="text-slate-400">Watt:</span> <span className="font-mono text-slate-200">{Math.abs(data.w_bat || 0).toFixed(1)} W</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-400">Volt:</span> <span className="font-mono text-slate-200">{data.v_bat?.toFixed(2) ?? '--'} V</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Amp:</span> <span className="font-mono text-slate-200">{data.i_bat?.toFixed(2) ?? '--'} A</span></div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex justify-around items-center mt-2">
          <div><span className="text-slate-400">Temp:</span> <span className="font-mono text-slate-200 ml-1">{data.t_box ? data.t_box.toFixed(1) + ' °C' : '--'}</span></div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div><span className="text-slate-400">Nuvole:</span> <span className="font-mono text-slate-200 ml-1">{data.cloud >= 0 ? Math.round(data.cloud * 100) + '%' : '--'}</span></div>
        </div>
      </div>
    );
  }
  return null;
}
