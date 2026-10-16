import { getPosition } from 'suncalc';

export interface ChartDataPoint {
  tstamp?: number;
  datetime_local: string;
  time: string;
  timeMin: number;
  w_pan: number | null;
  v_pan: number | null;
  i_pan: number | null;
  w_bat: number | null;
  v_bat: number | null;
  i_bat: number | null;
  w_bat_charge: number | null;
  w_bat_discharge: number | null;
  t_box: number | null;
  cloud: number;
  sun_elevation: number;
  is_gap?: boolean;
  [key: string]: any;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const clamped = Math.max(0, Math.min(1439, rounded));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function buildChartSeriesWithGaps(
  rawRecords: any[],
  lat: number,
  lon: number,
  stepMinutes = 10,
  gapThresholdMinutes = 18
): {
  chartData: ChartDataPoint[];
  peakTime: string;
  maxW: number;
  minW: number;
} {
  let peakTime = '--:--';
  let maxW = 0.1;
  let minW = 0;

  const validPoints: ChartDataPoint[] = (rawRecords || [])
    .filter((d: any) => d.is_valid !== 0 && d.is_valid !== false)
    .map((d: any) => {
      const dateObj = new Date(d.datetime_local);
      const time = dateObj.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const timeMin =
        dateObj.getHours() * 60 +
        dateObj.getMinutes() +
        dateObj.getSeconds() / 60;

      const wPan = d.w_pan !== undefined && d.w_pan !== null ? Number(d.w_pan) : 0;
      if (wPan > maxW) {
        maxW = wPan;
        peakTime = time;
      }

      const w_bat_charge = d.i_bat < 0 ? Math.abs(d.w_bat) : 0;
      const w_bat_discharge = d.i_bat > 0 ? -Math.abs(d.w_bat) : 0;

      if (w_bat_discharge < minW) {
        minW = w_bat_discharge;
      }

      const sunPos = getPosition(dateObj, lat, lon);
      const sun_elevation = Math.max(0, sunPos.altitude);

      return {
        ...d,
        time,
        timeMin: Number(timeMin.toFixed(2)),
        w_pan: wPan,
        w_bat_charge,
        w_bat_discharge,
        sun_elevation,
        is_gap: false,
      };
    })
    .sort((a, b) => a.timeMin - b.timeMin);

  if (validPoints.length === 0) {
    return { chartData: [], peakTime, maxW, minW };
  }

  const padded: ChartDataPoint[] = [];

  for (let i = 0; i < validPoints.length; i++) {
    const curr = validPoints[i];

    if (i > 0) {
      const prev = validPoints[i - 1];
      const diff = curr.timeMin - prev.timeMin;

      if (diff > gapThresholdMinutes) {
        const baseDate = new Date(prev.datetime_local);
        const firstSlot =
          Math.ceil((prev.timeMin + 3) / stepMinutes) * stepMinutes;
        const lastSlot =
          Math.floor((curr.timeMin - 3) / stepMinutes) * stepMinutes;

        let insertedCount = 0;
        for (let slotMin = firstSlot; slotMin <= lastSlot; slotMin += stepMinutes) {
          const slotDate = new Date(baseDate);
          const h = Math.floor(slotMin / 60);
          const m = slotMin % 60;
          slotDate.setHours(h, m, 0, 0);

          const sunPos = getPosition(slotDate, lat, lon);
          const sun_elevation = Math.max(0, sunPos.altitude);
          const slotTime = formatMinutesToHHMM(slotMin);
          const datePrefix = prev.datetime_local.substring(0, 10);

          padded.push({
            datetime_local: `${datePrefix}T${slotTime}:00`,
            time: slotTime,
            timeMin: slotMin,
            w_pan: null,
            v_pan: null,
            i_pan: null,
            w_bat: null,
            v_bat: null,
            i_bat: null,
            w_bat_charge: null,
            w_bat_discharge: null,
            t_box: null,
            cloud: -1,
            sun_elevation,
            is_gap: true,
          });
          insertedCount++;
        }

        // Garantisce almeno un punto null se il buco supera la soglia ma non cade su multipli di stepMinutes
        if (insertedCount === 0) {
          const midMin = Math.round((prev.timeMin + curr.timeMin) / 2);
          const midDate = new Date(baseDate);
          midDate.setHours(Math.floor(midMin / 60), midMin % 60, 0, 0);
          const sunPos = getPosition(midDate, lat, lon);
          const midTime = formatMinutesToHHMM(midMin);
          const datePrefix = prev.datetime_local.substring(0, 10);

          padded.push({
            datetime_local: `${datePrefix}T${midTime}:00`,
            time: midTime,
            timeMin: midMin,
            w_pan: null,
            v_pan: null,
            i_pan: null,
            w_bat: null,
            v_bat: null,
            i_bat: null,
            w_bat_charge: null,
            w_bat_discharge: null,
            t_box: null,
            cloud: -1,
            sun_elevation: Math.max(0, sunPos.altitude),
            is_gap: true,
          });
        }
      }
    }

    padded.push(curr);
  }

  return { chartData: padded, peakTime, maxW, minW };
}

export function getResponsiveTicks(
  chartData: ChartDataPoint[],
  containerWidth: number,
  brushRange?: { startIndex?: number; endIndex?: number } | null
): number[] {
  if (!chartData || chartData.length === 0) return [];

  const startIdx = Math.max(
    0,
    Math.min(chartData.length - 1, brushRange?.startIndex ?? 0)
  );
  const endIdx = Math.max(
    startIdx,
    Math.min(chartData.length - 1, brushRange?.endIndex ?? chartData.length - 1)
  );

  const minTime = chartData[startIdx].timeMin;
  const maxTime = chartData[endIdx].timeMin;
  const durationMin = Math.max(15, maxTime - minTime);

  const ALL_STEPS = [15, 30, 60, 120, 180, 240, 360];

  // Su mobile (< 640px) mostriamo solo ore intere (step >= 60m), a meno di zoom molto stretto (< 2h)
  // Su PC (>= 1024px) permettiamo fino al quarto d'ora (15m)
  let minAllowedStep = 15;
  if (containerWidth < 640) {
    minAllowedStep = durationMin <= 120 ? 30 : 60;
  } else if (containerWidth < 1024) {
    minAllowedStep = durationMin <= 240 ? 15 : 30;
  }

  const candidateSteps = ALL_STEPS.filter((s) => s >= minAllowedStep);

  const usableWidth = Math.max(180, containerWidth - 50);
  const minPxPerTick = containerWidth < 640 ? 54 : 46;
  const maxTickCount = Math.max(2, Math.floor(usableWidth / minPxPerTick));

  let chosenStep = candidateSteps[candidateSteps.length - 1];
  for (const step of candidateSteps) {
    if (durationMin / step <= maxTickCount) {
      chosenStep = step;
      break;
    }
  }

  const firstTick = Math.ceil(minTime / chosenStep) * chosenStep;
  const ticks: number[] = [];

  for (let t = firstTick; t <= maxTime; t += chosenStep) {
    ticks.push(t);
  }

  // Fallback se l'intervallo è molto corto e non cade alcun multiplo esatto
  if (ticks.length === 0) {
    ticks.push(Math.round(minTime), Math.round(maxTime));
  }

  return ticks;
}

