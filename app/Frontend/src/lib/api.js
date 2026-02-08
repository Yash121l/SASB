export const seasonOrder = ['Winter', 'Spring', 'Summer', 'Autumn'];

export const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined) return '—';
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Fetches data from static JSON files in /data directory.
 * Maps API endpoints to their static file counterparts.
 */
export const apiGet = async (endpoint, params = {}) => {
  let filename = '';
  
  // Map API endpoints to static files
  if (endpoint === '/api/meta') filename = 'meta.json';
  else if (endpoint === '/api/highlights') filename = 'highlights.json';
  else if (endpoint === '/api/region-trends') filename = 'region-trends.json';
  else if (endpoint === '/api/global-trends') filename = 'global-trends.json';
  else if (endpoint === '/api/countries/top-polluted') {
    // Check order for top vs clean
    if (params.order === 'asc') filename = 'cleanest.json';
    else filename = 'top-polluted.json';
    // Ignored: limit (static files have fixed limit)
  }
  else if (endpoint === '/api/cities/leaderboard') filename = 'city-leaderboard.json';
  else if (endpoint === '/api/cities/options') filename = 'city-options.json';
  else if (endpoint === '/api/gdp-vs-pm25') filename = 'gdp-vs-pm25-all.json'; // Contains all years
  else if (endpoint === '/api/seasonal-profile') filename = 'seasonal-profiles-all.json'; // Master file
  else if (endpoint === '/api/correlations') filename = 'correlations.json';
  else if (endpoint === '/api/model-metrics') filename = 'model-metrics.json';
  else if (endpoint === '/api/pollutants/correlation') filename = 'pollutant-correlation.json';
  
  // Specific Analysis files
  else if (endpoint === '/api/analysis/clustering') filename = 'clustering-k4.json';

  if (!filename) {
    console.error(`No static file mapping for endpoint: ${endpoint}`);
    return Promise.reject(new Error('Endpoint not found'));
  }

  try {
    const res = await fetch(`/data/${filename}`);
    if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
    let data = await res.json();

    // Post-processing for specific endpoints to mimic API logic
    
    // Filter GDP vs PM2.5 by year
    if (endpoint === '/api/gdp-vs-pm25' && params.year) {
      data.data = data.data.filter(row => row.year === params.year);
    }
    
    // Filter Seasonal Profile by city/country
    if (endpoint === '/api/seasonal-profile' && params.city) {
       const subset = data.data.filter(
        row => row.city.toLowerCase() === params.city.toLowerCase() && 
               row.country.toLowerCase() === params.country.toLowerCase()
      );
      return { city: params.city, country: params.country, data: subset };
    }

    return data;
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
};
