const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || __API_BASE_URL__ || 'http://localhost:8000';

export async function apiGet(path, params = {}) {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }
  return response.json();
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return Number(value).toFixed(digits);
}

export const seasonOrder = ['winter', 'spring', 'summer', 'autumn'];
