import { Env } from './index';

export interface AdafruitPayload {
  tstamp: number;
  v_pan: string;
  i_pan: string;
  w_pan: string;
  v_bat: string;
  i_bat: string;
  w_bat: string;
  rssi: number;
  valid: boolean | string;
  t_box: string;
  cloud: string;
}

export async function fetchAdafruitData(env: Env, limit: number = 15): Promise<AdafruitPayload[]> {
  const url = `https://io.adafruit.com/api/v2/${env.ADAFRUIT_USERNAME}/feeds/${env.ADAFRUIT_FEED}/data?limit=${limit}`;
  
  console.log('DEBUG URL CHIAMATO:', url);
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
        parsedRecords.push(payload);
      } catch (e) {
        console.error("Errore nel parsing del payload Adafruit:", item.value);
      }
    }
  }
  return parsedRecords;
}

