import { createPortal } from 'react-dom';

export default function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    const isCharging = data.i_bat < 0;
    const isDischarging = data.i_bat > 0;
    let batStatus = 'Inattiva';
    let batColor = 'text-slate-400';
    let batIcon = '🔋';
    
    if (isCharging) {
        batStatus = 'Ricarica';
        batColor = 'text-emerald-400';
        batIcon = '⚡';
    } else if (isDischarging) {
        batStatus = 'Scarica';
        batColor = 'text-red-400';
        batIcon = '🔌';
    }

    const hudContent = (
      <div className="flex flex-col md:flex-row w-full justify-between items-center gap-2 p-2">
        <div className="flex items-center gap-4 text-slate-400 border-b md:border-b-0 md:border-r border-slate-700/50 pb-2 md:pb-0 md:pr-4 w-full md:w-auto justify-between">
          <span className="font-bold text-slate-200">{label}</span>
          <span className="flex gap-3 text-xs">
            <span>🌡️ {data.t_box ? data.t_box.toFixed(1) + '°' : '--'}</span>
            <span>☁️ {data.cloud >= 0 ? Math.round(data.cloud * 100) + '%' : '--'}</span>
          </span>
        </div>
        
        <div className="flex-1 w-full grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
             <div>
               <div className="text-yellow-400 font-bold text-xs">☀️ Pannello</div>
               <div className="font-mono text-slate-400 text-[10px]">{data.v_pan?.toFixed(1) ?? '--'}V • {data.i_pan?.toFixed(1) ?? '--'}A</div>
             </div>
             <div className="font-mono text-slate-100 font-bold">{data.w_pan?.toFixed(1) ?? '--'} W</div>
          </div>
          <div className="flex items-center justify-between">
             <div>
               <div className={`font-bold text-xs ${batColor}`}>{batIcon} {batStatus}</div>
               <div className="font-mono text-slate-400 text-[10px]">{data.v_bat?.toFixed(1) ?? '--'}V • {data.i_bat?.toFixed(1) ?? '--'}A</div>
             </div>
             <div className="font-mono text-slate-100 font-bold">{Math.abs(data.w_bat || 0).toFixed(1)} W</div>
          </div>
        </div>
      </div>
    );

    const hudContainer = document.getElementById('chart-hud');
    if (hudContainer) {
      return createPortal(hudContent, hudContainer);
    }
  }
  return null; // Return null so the default floating tooltip is completely hidden
}
