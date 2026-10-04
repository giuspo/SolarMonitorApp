const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787/api';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('apiToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('apiToken');
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Errore API');
  }
  return data;
}

export const api = {
  getToday: () => fetchWithAuth('/today'),
  getHistory: () => fetchWithAuth('/history'),
  getHistoryDay: (date: string) => fetchWithAuth('/history/' + date),
  getHistoryMonth: (month: string) => fetchWithAuth('/history-month/' + month),
  getHistoryRange: (start: string, end: string) => fetchWithAuth(`/history-range?start=${start}&end=${end}`),
  syncData: () => fetchWithAuth('/sync', { method: 'POST' }),
  getStatus: () => fetchWithAuth('/status'),
  getSettings: () => fetchWithAuth('/settings'),
  updateSettings: (data: { latitude: number, longitude: number }) => fetchWithAuth('/settings', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};









