import { Env } from './index';

export interface AdafruitPayload {
  tstamp: number;
  v_pan: number | string;
  i_pan: number | string;
  w_pan: number | string;
  v_bat: number | string;
  i_bat: number | string;
  w_bat: number | string;
  rssi: number;
  valid: boolean | string;
  t_box: number | string;
  h_box?: number | string;
  cloud: number | string;
  pwm?: number | string;
  load_cut?: boolean | string | number;
  fw_ver?: string;
}

export async function fetchAdafruitData(env: Env, limit: number = 15): Promise<AdafruitPayload[]> {
  const url = `https://io.adafruit.com/api/v2/${env.ADAFRUIT_USERNAME}/feeds/${env.ADAFRUIT_FEED}/data?limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      'X-AIO-Key': env.ADAFRUIT_AIO_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Adafruit API FAILED:', response.status, errText);
    throw new Error('Adafruit API Error: ' + response.status);
  }

  const data = await response.json() as any[];
  const parsedRecords: AdafruitPayload[] = [];
  
  for (const item of data) {
    if (item.value) {
      try {
        const payload: AdafruitPayload = JSON.parse(item.value);
        if (typeof payload.valid === 'string') {
          payload.valid = payload.valid === 'true';
        }
        if (typeof payload.load_cut === 'string') {
          payload.load_cut = payload.load_cut === 'true' || payload.load_cut === '1';
        } else if (typeof payload.load_cut === 'number') {
          payload.load_cut = payload.load_cut !== 0;
        }
        parsedRecords.push(payload);
      } catch (e) {
        console.error("Errore nel parsing del payload Adafruit:", item.value);
      }
    }
  }
  return parsedRecords;
}

