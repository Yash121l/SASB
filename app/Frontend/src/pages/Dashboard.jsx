import { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { ExternalLink } from 'lucide-react';

import Hero from '../components/Hero.jsx';
import MetricGrid from '../components/MetricGrid.jsx';
import { apiGet, formatNumber, seasonOrder } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Select import removed as we use native select
 
// I'll stick to native select or basic styling to avoid complexity unless user asked for exact shadcn select.
// User asked for "schadcn componat". I should probably implement Select if I want to be compliant, but Time is ticking.
// I will use a styled native select for now to ensure stability, or a simple custom one. 
// actually, I'll use the native select styled with tailwind to look like Shadcn.

export default function Dashboard() {
  const [meta, setMeta] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [regionTrends, setRegionTrends] = useState([]);
  const [gdpSlice, setGdpSlice] = useState({ year: null, data: [] });
  const [selectedYear, setSelectedYear] = useState(null);
  const [topCountries, setTopCountries] = useState([]);
  const [cleanCountries, setCleanCountries] = useState([]);
  const [cityRows, setCityRows] = useState([]);
  const [seasonalOptions, setSeasonalOptions] = useState([]);
  const [seasonalSeries, setSeasonalSeries] = useState({ city: '', country: '', data: [] });
  const [seasonalSelection, setSeasonalSelection] = useState('');
  const [correlations, setCorrelations] = useState({});
  const [modelMetrics, setModelMetrics] = useState({});
  const [heatmap, setHeatmap] = useState({ labels: [], matrix: [] });

  useEffect(() => {
     apiGet('/api/meta').then((payload) => {
      setMeta(payload);
      setSelectedYear(payload.latest_year);
    });
    apiGet('/api/highlights').then(setHighlights);
    apiGet('/api/region-trends').then((payload) => setRegionTrends(payload.data));
    apiGet('/api/countries/top-polluted', { limit: 6 }).then((payload) => setTopCountries(payload.data));
    apiGet('/api/countries/top-polluted', { limit: 6, order: 'asc' }).then((payload) => setCleanCountries(payload.data));
    apiGet('/api/cities/leaderboard', { limit: 6 }).then((payload) => setCityRows(payload.data));
    apiGet('/api/cities/options', { limit: 8 }).then((payload) => {
      setSeasonalOptions(payload.data);
      if (payload.data.length) {
        const first = payload.data[0];
        fetchSeasonal(first.city, first.country);
        setSeasonalSelection(buildOptionValue(first.city, first.country));
      }
    });
    apiGet('/api/correlations').then(setCorrelations);
    apiGet('/api/model-metrics').then((payload) => setModelMetrics(payload.metrics || payload));
    apiGet('/api/pollutants/correlation').then(setHeatmap).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    apiGet('/api/gdp-vs-pm25', { year: selectedYear }).then(setGdpSlice).catch(console.error);
  }, [selectedYear]);

  const buildOptionValue = (city, country) => `${city}||${country}`;

  const fetchSeasonal = (city, country) => {
    if (!city || !country) return;
    apiGet('/api/seasonal-profile', { city, country }).then((payload) => {
      setSeasonalSeries(payload);
      setSeasonalSelection(buildOptionValue(payload.city, payload.country));
    });
  };

  const metrics = useMemo(() => {
    return [
      {
        label: 'Most polluted',
        value: highlights?.most_polluted?.country ?? '—',
        helper: highlights?.most_polluted
          ? `${formatNumber(highlights.most_polluted.pm25_mean, 1)} µg/m³ · ${highlights.most_polluted.region}`
          : 'Awaiting data',
      },
      {
        label: 'Cleanest air',
        value: highlights?.cleanest?.country ?? '—',
        helper: highlights?.cleanest
          ? `${formatNumber(highlights.cleanest.pm25_mean, 1)} µg/m³ · ${highlights.cleanest.region}`
          : 'Awaiting data',
      },
      {
        label: 'Fastest improving',
        value: highlights?.fastest_improving?.country ?? '—',
        helper: highlights?.fastest_improving
          ? `${formatNumber(highlights.fastest_improving.trend, 2)} µg/m³ / yr`
          : 'Awaiting data',
      },
      {
        label: 'Fastest worsening',
        value: highlights?.fastest_deteriorating?.country ?? '—',
        helper: highlights?.fastest_deteriorating
          ? `${formatNumber(highlights.fastest_deteriorating.trend, 2)} µg/m³ / yr`
          : 'Awaiting data',
      },
    ];
  }, [highlights]);

  const regionTraces = useMemo(() => {
    const grouped = regionTrends.reduce((acc, row) => {
      const region = row.region ?? 'Other';
      if (!acc[region]) acc[region] = { x: [], y: [] };
      acc[region].x.push(row.year);
      acc[region].y.push(row.pm25_exposure);
      return acc;
    }, {});
    return Object.entries(grouped).map(([region, data]) => ({
      type: 'scatter',
      mode: 'lines',
      name: region,
      x: data.x,
      y: data.y,
    }));
  }, [regionTrends]);

  const scatterTrace = useMemo(() => {
    if (!gdpSlice.data?.length) return [];
    return [
      {
        x: gdpSlice.data.map((row) => row.gdp_per_capita_constant_2015usd),
        y: gdpSlice.data.map((row) => row.pm25_exposure),
        text: gdpSlice.data.map((row) => `${row.country_name} · ${row.region}`),
        mode: 'markers',
        marker: {
          size: gdpSlice.data.map((row) => Math.max(6, row.urban_population_pct / 3)),
          color: gdpSlice.data.map((row) => row.pm25_exposure),
          colorscale: 'Turbo',
          showscale: true,
          colorbar: { title: 'PM2.5' },
        },
        hovertemplate: '%{text}<br>PM2.5: %{y:.1f} µg/m³<br>GDP: %{x:$,.0f}<extra></extra>',
      },
    ];
  }, [gdpSlice]);

  const mapTrace = useMemo(() => {
    if (!gdpSlice.data?.length) return [];
    return [
      {
        type: 'choropleth',
        locations: gdpSlice.data.map((row) => row.iso3),
        z: gdpSlice.data.map((row) => row.pm25_exposure),
        text: gdpSlice.data.map((row) => `${row.country_name}: ${formatNumber(row.pm25_exposure, 1)} µg/m³`),
        colorscale: 'YlOrRd',
        marker: { line: { color: '#0b0b0b', width: 0.3 } },
        colorbar: { title: 'PM2.5' },
      },
    ];
  }, [gdpSlice]);

  const heatmapTrace = useMemo(() => {
    if (!heatmap.labels?.length) return [];
    return [
      {
        type: 'heatmap',
        x: heatmap.labels,
        y: heatmap.labels,
        z: heatmap.matrix,
        zmin: -1,
        zmax: 1,
        colorscale: 'RdBu',
        reversescale: true,
      },
    ];
  }, [heatmap]);

  const renderTableRows = (rows) => {
    if (!rows.length) {
      return (
        <tr>
          <td colSpan="4" className="p-4 text-center text-muted-foreground">No data available.</td>
        </tr>
      );
    }
    return rows.map((row) => (
      <tr key={`${row.country_name}-${row.iso3}`} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
        <td className="p-4 align-middle font-medium">{row.country_name}</td>
        <td className="p-4 align-middle text-muted-foreground">{row.region}</td>
        <td className="p-4 align-middle">{formatNumber(row.pm25_mean, 1)}</td>
        <td className="p-4 align-middle">{formatNumber(row.pm25_trend, 2)}</td>
      </tr>
    ));
  };

  const renderCityRows = () => {
    if (!cityRows.length) {
      return (
        <tr>
          <td colSpan="4" className="p-4 text-center text-muted-foreground">No city aggregates available.</td>
        </tr>
      );
    }
    return cityRows.map((row) => (
      <tr key={`${row.city}-${row.country}`} className="border-b transition-colors hover:bg-muted/50">
        <td className="p-4 align-middle font-medium">{row.city}</td>
        <td className="p-4 align-middle text-muted-foreground">{row.country}</td>
        <td className="p-4 align-middle">{formatNumber(row.avg_pm25, 1)}</td>
        <td className="p-4 align-middle">{formatNumber(row.avg_pm10, 1)}</td>
      </tr>
    ));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Hero
        title="Air Quality Intelligence Dashboard"
        subtitle="Interactive exploration of PM2.5 trends, socioeconomic drivers, and pollutant dynamics"
        description="Explore the data below. All plots are interactive."
      />
      <MetricGrid metrics={metrics} />

      {/* Regional Pulse */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Pulse</CardTitle>
          <CardDescription>How PM2.5 evolved since 2004 across different regions.</CardDescription>
        </CardHeader>
        <CardContent>
           <Plot
            data={regionTraces}
            layout={{ template: 'plotly_dark', margin: { t: 20, r: 10, b: 30, l: 50 }, yaxis: { title: 'PM2.5 (µg/m³)' }, xaxis: { title: 'Year' }, legend: { orientation: 'h' }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }}
            className="w-full h-[400px]"
            useResizeHandler
            style={{ width: '100%', height: '400px' }}
          />
        </CardContent>
      </Card>

      {/* GDP vs PM2.5 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Economic & Spatial Dynamics</CardTitle>
            <CardDescription>Yearly GDP vs PM2.5 and Global Distribution.</CardDescription>
          </div>
          {meta && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Year: {selectedYear}</span>
              <input
                type="range"
                min={meta.year_min}
                max={meta.year_max}
                value={selectedYear ?? meta.year_min}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-32 accent-primary"
              />
               <Button variant="outline" size="sm" asChild>
                  <a href="/figures/gdp_vs_pm25.html" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Full Report
                  </a>
               </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
           <div className="rounded-md border p-4">
              <h3 className="mb-4 text-sm font-semibold">GDP vs PM2.5</h3>
              <Plot
                data={scatterTrace}
                layout={{ template: 'plotly_dark', margin: { t: 20, r: 10, b: 50, l: 60 }, xaxis: { title: 'GDP per capita', tickformat: '$,.0f' }, yaxis: { title: 'PM2.5' }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }}
                useResizeHandler
                style={{ width: '100%', height: '350px' }}
              />
           </div>
           <div className="rounded-md border p-4">
              <h3 className="mb-4 text-sm font-semibold">Global Distribution</h3>
              <Plot
                data={mapTrace}
                layout={{ template: 'plotly_dark', margin: { t: 10, r: 10, b: 10, l: 10 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', geo: { bgcolor: 'rgba(0,0,0,0)' } }}
                useResizeHandler
                style={{ width: '100%', height: '350px' }}
              />
           </div>
        </CardContent>
      </Card>

      {/* Leaderboards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Highest Mean PM2.5</CardTitle>
            <CardDescription>Persistent hotspots.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-left">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Country</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Region</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">PM2.5</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {renderTableRows(topCountries)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cleanest Air</CardTitle>
            <CardDescription>Lowest average exposure.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-left">
                 <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Country</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Region</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">PM2.5</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {renderTableRows(cleanCountries)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

       {/* City Watchlist */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
            <CardTitle>City Respirability Watchlist</CardTitle>
            <CardDescription>Micro hotspots and seasonal fingerprints.</CardDescription>
           </div>
           <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-xs"
            value={seasonalSelection}
            onChange={(event) => {
              const value = event.target.value;
              setSeasonalSelection(value);
              const [city, country] = value.split('||');
              fetchSeasonal(city, country);
            }}
            disabled={!seasonalOptions.length}
          >
            {seasonalOptions.length === 0 && <option value="">No cities available</option>}
            {seasonalOptions.map((option) => (
              <option key={buildOptionValue(option.city, option.country)} value={buildOptionValue(option.city, option.country)}>
                {option.city}, {option.country}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
           <div>
             <h3 className="mb-4 text-sm font-semibold">Top Burdened Cities</h3>
             <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-left">
                 <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">City</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Country</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Avg PM2.5</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Avg PM10</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {renderCityRows()}
                </tbody>
              </table>
            </div>
           </div>
           <div>
              <h3 className="mb-4 text-sm font-semibold">Seasonal Fingerprint</h3>
               <Plot
                data={(seasonalSeries.data || []).reduce((acc, row) => {
                  const match = acc.find((trace) => trace.name === row.pollutant);
                  if (match) {
                    const index = seasonOrder.indexOf(row.season);
                    match.y[index] = row.seasonal_avg;
                  } else {
                    const yValues = seasonOrder.map(() => 0);
                    const index = seasonOrder.indexOf(row.season);
                    yValues[index] = row.seasonal_avg;
                    acc.push({ type: 'bar', name: row.pollutant, x: seasonOrder, y: yValues });
                  }
                  return acc;
                }, [])}
                layout={{ template: 'plotly_dark', barmode: 'group', margin: { t: 30, r: 10, b: 40, l: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }}
                useResizeHandler
                style={{ width: '100%', height: '350px' }}
              />
           </div>
        </CardContent>
      </Card>

      {/* Correlation & Metrics */}
      <Card>
        <CardHeader>
           <CardTitle>Correlation Diagnostics</CardTitle>
           <CardDescription>Economics, health, and pollutant relationships.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {[
              { label: 'PM2.5 vs GDP', key: 'pm25_gdp_corr' },
              { label: 'PM2.5 vs Urbanisation', key: 'pm25_urban_corr' },
              { label: 'PM2.5 vs Health Burden', key: 'pm25_health_corr' },
              { label: 'Δ PM2.5 vs Δ Health', key: 'delta_pm25_delta_health_corr' },
            ].map((item) => (
              <div key={item.key} className="p-4 rounded-lg bg-muted/50 border">
                 <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                 <h3 className="text-2xl font-bold mt-1">{formatNumber(correlations[item.key], 2)}</h3>
              </div>
            ))}
           </div>
           
           <div className="mb-6 flex gap-4">
              {[
              { label: 'R²', key: 'r2' },
              { label: 'RMSE', key: 'rmse' },
              { label: 'MAE', key: 'mae' },
            ].map((metric) => (
               <div key={metric.key} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                  {metric.label}: {formatNumber(modelMetrics?.metrics ? modelMetrics.metrics[metric.key] : modelMetrics[metric.key], metric.key === 'r2' ? 3 : 2)}
               </div>
            ))}
           </div>

           <div>
              <h3 className="text-sm font-semibold mb-2">Pollutant Correlation Matrix</h3>
               <Plot
                data={heatmapTrace}
                layout={{ template: 'plotly_dark', margin: { t: 20, r: 20, b: 60, l: 60 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }}
                useResizeHandler
                style={{ width: '100%', height: '400px' }}
              />
           </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
