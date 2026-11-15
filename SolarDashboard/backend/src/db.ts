import { Env } from './index';
import { AdafruitPayload } from './adafruit';

const MIN_TS = 1704067200; // 2024-01-01T00:00:00Z

function isValidRecord(r: unknown): r is AdafruitPayload {
  if (!r || typeof r !== 'object') return false;
  const tstamp = (r as AdafruitPayload).tstamp;
  const nowSec = Math.floor(Date.now() / 1000);
  return (
    typeof tstamp === 'number' &&
    Number.isInteger(tstamp) &&
    tstamp >= MIN_TS &&
    tstamp <= nowSec + 300
  );
}

function parseFiniteNumber(val: unknown, fallback: number): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(num) ? num : fallback;
}

function parseBoolFlag(val: unknown): number {
  return (val === true || val === 'true' || val === 1 || val === '1') ? 1 : 0;
}

export async function saveRecordsToD1(env: Env, records: AdafruitPayload[]) {
  const validRecords = records.filter(isValidRecord);
  if (validRecords.length < records.length) {
    console.warn(`Scartati ${records.length - validRecords.length} record con tstamp non valido`);
  }
  if (validRecords.length === 0) return { inserted: 0 };

  const stmt = env.DB.prepare(`INSERT INTO solar_records
    (tstamp, datetime_local, v_pan, i_pan, w_pan, v_bat, i_bat, w_bat, rssi, is_valid, t_box, h_box, cloud, load_pwm, is_load_cut, fw_ver)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tstamp) DO UPDATE SET
      h_box = COALESCE(NULLIF(excluded.h_box, -1), solar_records.h_box, excluded.h_box),
      fw_ver = COALESCE(excluded.fw_ver, solar_records.fw_ver),
      load_pwm = excluded.load_pwm,
      is_load_cut = excluded.is_load_cut
    WHERE
      solar_records.h_box IS NOT COALESCE(NULLIF(excluded.h_box, -1), solar_records.h_box, excluded.h_box)
      OR solar_records.fw_ver IS NOT COALESCE(excluded.fw_ver, solar_records.fw_ver)
      OR solar_records.load_pwm IS NOT excluded.load_pwm
      OR solar_records.is_load_cut IS NOT excluded.is_load_cut`);

  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const batch = validRecords.map(record => {
    const date = new Date(record.tstamp * 1000);
    const formatted = formatter.format(date); // YYYY-MM-DD hh:mm:ss
    const datetime_local = formatted.replace(' ', 'T');

    const hBox = parseFiniteNumber(record.h_box, -1);
    const loadPwm = Math.max(0, Math.min(1, parseFiniteNumber(record.pwm, 0)));
    const isLoadCut = parseBoolFlag(record.load_cut);
    const fwVer = typeof record.fw_ver === 'string' && record.fw_ver.trim() !== '' ? record.fw_ver.trim() : null;

    return stmt.bind(
      record.tstamp,
      datetime_local,
      parseFiniteNumber(record.v_pan, 0),
      parseFiniteNumber(record.i_pan, 0),
      parseFiniteNumber(record.w_pan, 0),
      parseFiniteNumber(record.v_bat, 0),
      parseFiniteNumber(record.i_bat, 0),
      parseFiniteNumber(record.w_bat, 0),
      parseFiniteNumber(record.rssi, 0),
      record.valid ? 1 : 0,
      parseFiniteNumber(record.t_box, -1),
      hBox,
      parseFiniteNumber(record.cloud, -1),
      loadPwm,
      isLoadCut,
      fwVer
    );
  });

  const results = await env.DB.batch(batch);
  let insertedCount = 0;
  for (const res of results) {
     if (res.meta.changes > 0) insertedCount += res.meta.changes;
  }
  return { inserted: insertedCount };
}

export async function updateDailySummary(env: Env) {
    await env.DB.prepare(`INSERT INTO daily_summaries 
        (date, wh_produced, wh_battery_charge, wh_battery_discharge, peak_power_w, v_bat_min, v_bat_max, avg_cloud, t_box_max, h_box_max, avg_load_pwm, load_cut_count, anomaly_count)
        SELECT 
            date(datetime_local),
            SUM(CASE WHEN is_valid = 1 THEN w_pan ELSE 0 END) / 6.0 AS wh_produced,
            SUM(CASE WHEN is_valid = 1 AND i_bat < 0 THEN ABS(w_bat) ELSE 0 END) / 6.0 AS wh_battery_charge,
            SUM(CASE WHEN is_valid = 1 AND i_bat > 0 THEN ABS(w_bat) ELSE 0 END) / 6.0 AS wh_battery_discharge,
            MAX(CASE WHEN is_valid = 1 THEN w_pan END) AS peak_power_w,
            MIN(CASE WHEN is_valid = 1 THEN v_bat END) AS v_bat_min,
            MAX(CASE WHEN is_valid = 1 THEN v_bat END) AS v_bat_max,
            AVG(NULLIF(cloud, -1)) AS avg_cloud,
            MAX(CASE WHEN is_valid = 1 AND t_box != -1 THEN t_box END) AS t_box_max,
            MAX(CASE WHEN is_valid = 1 AND h_box IS NOT NULL AND h_box >= 0 THEN h_box END) AS h_box_max,
            AVG(CASE WHEN is_valid = 1 THEN COALESCE(load_pwm, 0) END) AS avg_load_pwm,
            SUM(CASE WHEN is_load_cut = 1 THEN 1 ELSE 0 END) AS load_cut_count,
            SUM(CASE WHEN is_valid = 0 THEN 1 ELSE 0 END) AS anomaly_count
        FROM solar_records
        GROUP BY date(datetime_local)
        ON CONFLICT(date) DO UPDATE SET
            wh_produced = excluded.wh_produced,
            wh_battery_charge = excluded.wh_battery_charge,
            wh_battery_discharge = excluded.wh_battery_discharge,
            peak_power_w = excluded.peak_power_w,
            v_bat_min = excluded.v_bat_min,
            v_bat_max = excluded.v_bat_max,
            avg_cloud = excluded.avg_cloud,
            t_box_max = excluded.t_box_max,
            h_box_max = excluded.h_box_max,
            avg_load_pwm = excluded.avg_load_pwm,
            load_cut_count = excluded.load_cut_count,
            anomaly_count = excluded.anomaly_count`).run();
}






