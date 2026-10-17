interface TouchTravellerProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ChartDisplayPoint {
  time?: string;
  is_gap?: boolean;
  sun_elevation?: number | null;
  w_pan?: number | null;
  v_pan?: number | null;
  i_pan?: number | null;
  w_bat?: number | null;
  v_bat?: number | null;
  i_bat?: number | null;
  t_box?: number | null;
  cloud?: number | null;
}

export function TouchTraveller(props: TouchTravellerProps) {
  const { x, y, width, height } = props;
  if (x == null || y == null || width == null || height == null) return <g />;

  const cx = x + width / 2;
  const cy = y + height / 2;
  const gripHalfHeight = Math.min(7, Math.max(4, height * 0.2));

  return (
    <g className="cursor-ew-resize touch-manipulation">
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(4, width - 2)}
        height={Math.max(4, height - 2)}
        rx={6}
        fill="#1e293b"
        stroke="#38bdf8"
        strokeWidth={1.75}
      />
      <line
        x1={cx - 2.5}
        y1={cy - gripHalfHeight}
        x2={cx - 2.5}
        y2={cy + gripHalfHeight}
        stroke="#94a3b8"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <line
        x1={cx + 2.5}
        y1={cy - gripHalfHeight}
        x2={cx + 2.5}
        y2={cy + gripHalfHeight}
        stroke="#94a3b8"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </g>
  );
}

export function CompactChartHud({
  displayData,
  layout = 'bottom'
}: {
  displayData: ChartDisplayPoint | null | undefined;
  layout?: 'bottom' | 'sidebar';
}) {
  if (!displayData) return null;

  const isCharging = (displayData.i_bat ?? 0) < 0;
  const isSidebar = layout === 'sidebar';

  if (displayData.is_gap) {
    if (isSidebar) {
      return (
        <div className="w-[200px] sm:w-[220px] shrink-0 self-stretch grid grid-cols-1 grid-rows-4 gap-px bg-amber-500/25 rounded-xl border border-amber-500/40 overflow-hidden">
          <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
            <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
              <span>🕒 Orario</span>
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded normal-case leading-none">
                Offline
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
              <span className="font-bold text-slate-100 text-base sm:text-lg leading-none">{displayData.time}</span>
              <span className="text-[11px] sm:text-xs font-medium text-amber-300/90 leading-none">
                ☀️ Sole: {displayData.sun_elevation != null ? `${Math.round(displayData.sun_elevation)}°` : '--°'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
              ☀️ Pannello
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
              <span className="font-bold text-slate-500 text-base sm:text-lg leading-none">-- W</span>
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-none">Nessun dato</span>
            </div>
          </div>

          <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
              🔋 Batteria
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
              <span className="font-bold text-slate-500 text-base sm:text-lg leading-none">-- W</span>
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-none">Nessun dato</span>
            </div>
          </div>

          <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
              🌡️ Box & Meteo
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
              <span className="font-bold text-slate-500 text-base sm:text-lg leading-none">-- °C</span>
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 leading-none">Offline</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-px bg-amber-500/25 rounded-xl border border-amber-500/40 overflow-hidden">
        <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
          <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            <span>🕒 Orario</span>
            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded normal-case">
              Offline
            </span>
          </div>
          <div className="mt-1 font-bold text-slate-100 text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap">
            {displayData.time}
          </div>
          <div className="mt-0.5 text-xs md:text-sm font-medium text-amber-300/90 tabular-nums leading-tight whitespace-nowrap">
            ☀️ Sole: {displayData.sun_elevation != null ? `${Math.round(displayData.sun_elevation)}°` : '--°'}
          </div>
        </div>

        <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            ☀️ Pannello
          </div>
          <div className="mt-1 font-bold text-slate-500 text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap">
            -- W
          </div>
          <div className="mt-0.5 text-xs md:text-sm font-medium text-slate-500 tabular-nums leading-tight whitespace-nowrap">
            Nessun dato
          </div>
        </div>

        <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            🔋 Batteria
          </div>
          <div className="mt-1 font-bold text-slate-500 text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap">
            -- W
          </div>
          <div className="mt-0.5 text-xs md:text-sm font-medium text-slate-500 tabular-nums leading-tight whitespace-nowrap">
            Nessun dato
          </div>
        </div>

        <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            🌡️ Box & Meteo
          </div>
          <div className="mt-1 font-bold text-slate-500 text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap">
            -- °C
          </div>
          <div className="mt-0.5 text-xs md:text-sm font-medium text-slate-500 tabular-nums leading-tight whitespace-nowrap">
            Sensore offline
          </div>
        </div>
      </div>
    );
  }

  if (isSidebar) {
    return (
      <div className="w-[200px] sm:w-[220px] shrink-0 self-stretch grid grid-cols-1 grid-rows-4 gap-px bg-slate-700/60 rounded-xl border border-slate-700/80 overflow-hidden">
        {/* Cell 1: Orario & Sole */}
        <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
            🕒 Orario
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
            <span className="font-bold text-slate-100 text-base sm:text-lg leading-none">
              {displayData.time}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-amber-300/90 leading-none">
              ☀️ Sole: {displayData.sun_elevation != null ? `${Math.round(displayData.sun_elevation)}°` : '--°'}
            </span>
          </div>
        </div>

        {/* Cell 2: Pannello Solare */}
        <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
            ☀️ Pannello
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
            <span className="font-bold text-yellow-400 text-base sm:text-lg leading-none">
              {displayData.w_pan != null ? `${displayData.w_pan.toFixed(1)} W` : '-- W'}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-slate-300 leading-none">
              {displayData.v_pan?.toFixed(1) ?? '--'}V • {displayData.i_pan?.toFixed(2) ?? '--'}A
            </span>
          </div>
        </div>

        {/* Cell 3: Batteria */}
        <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
          <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
            <span>🔋 Batteria</span>
            <span
              className={`text-[10px] font-semibold normal-case px-1.5 py-0.5 rounded leading-none ${
                isCharging ? 'text-emerald-400 bg-emerald-500/15' : 'text-red-400 bg-red-500/15'
              }`}
            >
              {isCharging ? 'Carica' : 'Scarica'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
            <span
              className={`font-bold text-base sm:text-lg leading-none ${
                isCharging ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {Math.abs(displayData.w_bat || 0).toFixed(1)} W
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-slate-300 leading-none">
              {displayData.v_bat?.toFixed(1) ?? '--'}V • {displayData.i_bat?.toFixed(2) ?? '--'}A
            </span>
          </div>
        </div>

        {/* Cell 4: Box & Meteo */}
        <div className="bg-slate-900/95 px-3 py-1.5 flex flex-col justify-center text-left">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap leading-tight">
            🌡️ Box & Meteo
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5 tabular-nums whitespace-nowrap">
            <span className="font-bold text-slate-100 text-base sm:text-lg leading-none">
              {displayData.t_box != null ? `${displayData.t_box.toFixed(1)} °C` : '-- °C'}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-sky-400 leading-none">
              {displayData.cloud != null && displayData.cloud >= 0
                ? `☁️ Nuv: ${Math.round(displayData.cloud * 100)}%`
                : '☁️ Nuv: --'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-700/60 rounded-xl border border-slate-700/80 overflow-hidden">
      {/* Cell 1: Orario & Sole */}
      <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
          🕒 Orario
        </div>
        <div className="mt-1 font-bold text-slate-100 text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap">
          {displayData.time}
        </div>
        <div className="mt-0.5 text-xs md:text-sm font-medium text-amber-300/90 tabular-nums leading-tight whitespace-nowrap">
          ☀️ Sole: {displayData.sun_elevation != null ? `${Math.round(displayData.sun_elevation)}°` : '--°'}
        </div>
      </div>

      {/* Cell 2: Pannello Solare */}
      <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
          ☀️ Pannello
        </div>
        <div className="mt-1 font-bold text-yellow-400 text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap">
          {displayData.w_pan != null ? `${displayData.w_pan.toFixed(1)} W` : '-- W'}
        </div>
        <div className="mt-0.5 text-xs md:text-sm font-medium text-slate-300 tabular-nums leading-tight whitespace-nowrap">
          {displayData.v_pan?.toFixed(1) ?? '--'}V • {displayData.i_pan?.toFixed(2) ?? '--'}A
        </div>
      </div>

      {/* Cell 3: Batteria */}
      <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
          <span>🔋 Batteria</span>
          <span
            className={`text-[10px] font-semibold normal-case px-1.5 py-0.5 rounded leading-none ${
              isCharging ? 'text-emerald-400 bg-emerald-500/15' : 'text-red-400 bg-red-500/15'
            }`}
          >
            {isCharging ? 'Carica' : 'Scarica'}
          </span>
        </div>
        <div
          className={`mt-1 font-bold text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap ${
            isCharging ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {Math.abs(displayData.w_bat || 0).toFixed(1)} W
        </div>
        <div className="mt-0.5 text-xs md:text-sm font-medium text-slate-300 tabular-nums leading-tight whitespace-nowrap">
          {displayData.v_bat?.toFixed(1) ?? '--'}V • {displayData.i_bat?.toFixed(2) ?? '--'}A
        </div>
      </div>

      {/* Cell 4: Box & Meteo */}
      <div className="bg-slate-900/95 px-3.5 py-2.5 flex flex-col justify-between text-left">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
          🌡️ Box & Meteo
        </div>
        <div className="mt-1 font-bold text-slate-100 text-lg md:text-xl tabular-nums leading-tight whitespace-nowrap">
          {displayData.t_box != null ? `${displayData.t_box.toFixed(1)} °C` : '-- °C'}
        </div>
        <div className="mt-0.5 text-xs md:text-sm font-medium text-sky-400 tabular-nums leading-tight whitespace-nowrap">
          {displayData.cloud != null && displayData.cloud >= 0
            ? `☁️ Nuvole: ${Math.round(displayData.cloud * 100)}%`
            : '☁️ Nuvole: --'}
        </div>
      </div>
    </div>
  );
}
