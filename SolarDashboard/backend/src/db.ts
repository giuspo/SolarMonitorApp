import { Env } from './index';
import { AdafruitPayload } from './adafruit';

export async function saveRecordsToD1(env: Env, records: AdafruitPayload[]) {
  if (records.length === 0) return { inserted: 0 };

  const stmt = env.DB.prepare(`INSERT OR IGNORE INTO solar_records 
    (tstamp, datetime_local, v_pan, i_pan, w_pan, v_bat, i_bat, w_bat, rssi, is_valid, t_box, cloud)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` );

  const batch = records.map(record => {
    const date = new Date(record.tstamp * 1000);
    const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatted = formatter.format(date); // YYYY-MM-DD hh:mm:ss
    const datetime_local = formatted.replace(' ', 'T'); 

    return stmt.bind(
      record.tstamp,
      datetime_local,
      parseFloat(record.v_pan) || 0,
      parseFloat(record.i_pan) || 0,
      parseFloat(record.w_pan) || 0,
      parseFloat(record.v_bat) || 0,
      parseFloat(record.i_bat) || 0,
      parseFloat(record.w_bat) || 0,
      record.rssi || 0,
      record.valid ? 1 : 0,
      parseFloat(record.t_box) || 0,
      parseFloat(record.cloud) || 0
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
        (date, wh_produced, wh_battery_charge, wh_battery_discharge, peak_power_w, v_bat_min, v_bat_max, avg_cloud, t_box_max, anomaly_count)
        SELECT 
            date(datetime_local),
            SUM(w_pan) / 6.0 AS wh_produced,
            SUM(CASE WHEN i_bat < 0 THEN ABS(w_bat) ELSE 0 END) / 6.0 AS wh_battery_charge,
            SUM(CASE WHEN i_bat > 0 THEN ABS(w_bat) ELSE 0 END) / 6.0 AS wh_battery_discharge,
            MAX(w_pan) AS peak_power_w,
            MIN(v_bat) AS v_bat_min,
            MAX(v_bat) AS v_bat_max,
            AVG(NULLIF(cloud, -1)) AS avg_cloud,
            MAX(t_box) AS t_box_max,
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
            anomaly_count = excluded.anomaly_count`).run();
}




