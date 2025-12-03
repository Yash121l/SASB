import { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';

import Hero from '../components/Hero.jsx';
import MetricGrid from '../components/MetricGrid.jsx';
import { apiGet, formatNumber, seasonOrder } from '../lib/api.js';

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

  const renderTableRows = (rows, type) => {
    if (!rows.length) {
      return (
        <tr>
          <td colSpan="4">No data available.</td>
        </tr>
      );
    }
    return rows.map((row) => (
      <tr key={`${type}-${row.country_name}-${row.iso3}`}>
        <td>{row.country_name}</td>
        <td>{row.region}</td>
        <td>{formatNumber(row.pm25_mean, 1)}</td>
        <td>{formatNumber(row.pm25_trend, 2)}</td>
      </tr>
    ));
  };

  const renderCityRows = () => {
    if (!cityRows.length) {
      return (
        <tr>
          <td colSpan="4">No city aggregates available.</td>
        </tr>
      );
    }
    return cityRows.map((row) => (
      <tr key={`${row.city}-${row.country}`}>
        <td>{row.city}</td>
        <td>{row.country}</td>
        <td>{formatNumber(row.avg_pm25, 1)}</td>
        <td>{formatNumber(row.avg_pm10, 1)}</td>
      </tr>
    ));
  };

  return (
    <>
      <Hero
        title="Air Quality Intelligence Dashboard"
        subtitle="Interactive exploration of PM2.5 trends, socioeconomic drivers, and pollutant dynamics"
        description="Use the navigation links for the policy lab and research hub. All plots are powered by the FastAPI backend and refresh automatically when the pipeline is re-run."
      />
      <MetricGrid metrics={metrics} />

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Regional pulse</p>
            <h2>How PM2.5 evolved since 2004</h2>
          </div>
        </div>
        <div className="panel__body">
          <Plot
            data={regionTraces}
            layout={{ template: 'plotly_dark', margin: { t: 20, r: 10, b: 30, l: 50 }, yaxis: { title: 'PM2.5 (µg/m³)' }, xaxis: { title: 'Year' }, legend: { orientation: 'h' } }}
            className="plot"
            useResizeHandler
            style={{ width: '100%', height: '420px' }}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Economic & spatial dynamics</p>
            <h2>Yearly GDP vs PM2.5</h2>
          </div>
          {meta && (
            <div className="panel__controls">
              <label htmlFor="year-range">Year</label>
              <input
                id="year-range"
                type="range"
                min={meta.year_min}
                max={meta.year_max}
                value={selectedYear ?? meta.year_min}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              />
              <span>{selectedYear}</span>
            </div>
          )}
        </div>
        <div className="panel__body panel__body--grid">
          <div>
            <h3 className="subheading">GDP vs PM2.5 (bubble sized by urbanisation)</h3>
            <Plot
              data={scatterTrace}
              layout={{ template: 'plotly_dark', margin: { t: 20, r: 10, b: 50, l: 60 }, xaxis: { title: 'GDP per capita (2015 USD)', tickformat: '$,.0f' }, yaxis: { title: 'PM2.5 (µg/m³)' } }}
              className="plot"
              useResizeHandler
              style={{ width: '100%', height: '360px' }}
            />
          </div>
          <div>
            <h3 className="subheading">Interactive choropleth</h3>
            <Plot
              data={mapTrace}
              layout={{ template: 'plotly_dark', margin: { t: 10, r: 10, b: 10, l: 10 } }}
              className="plot"
              useResizeHandler
              style={{ width: '100%', height: '360px' }}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Country leaderboards</p>
            <h2>Persistent hotspots vs resilient improvers</h2>
          </div>
        </div>
        <div className="panel__body panel__body--grid">
          <div>
            <h3 className="subheading">Highest mean PM2.5</h3>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Region</th>
                  <th>PM2.5</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>{renderTableRows(topCountries, 'top')}</tbody>
            </table>
          </div>
          <div>
            <h3 className="subheading">Cleanest air</h3>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Region</th>
                  <th>PM2.5</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>{renderTableRows(cleanCountries, 'clean')}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">City respirability watchlist</p>
            <h2>Micro hotspots and seasonal fingerprints</h2>
          </div>
          <select
            className="select"
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
        </div>
        <div className="panel__body panel__body--grid">
          <div>
            <h3 className="subheading">Top burdened cities</h3>
            <table>
              <thead>
                <tr>
                  <th>City</th>
                  <th>Country</th>
                  <th>Avg PM2.5</th>
                  <th>Avg PM10</th>
                </tr>
              </thead>
              <tbody>{renderCityRows()}</tbody>
            </table>
          </div>
          <div>
            <h3 className="subheading">Seasonal fingerprint</h3>
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
              layout={{ template: 'plotly_dark', barmode: 'group', margin: { t: 30, r: 10, b: 40, l: 40 } }}
              className="plot"
              useResizeHandler
              style={{ width: '100%', height: '360px' }}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Correlation diagnostics</p>
            <h2>Economics, health, and pollutant stacks</h2>
          </div>
        </div>
        <div className="panel__body">
          <div className="correlation-grid">
            {[
              { label: 'PM2.5 vs GDP per capita', key: 'pm25_gdp_corr' },
              { label: 'PM2.5 vs Urbanisation', key: 'pm25_urban_corr' },
              { label: 'PM2.5 vs Communicable deaths', key: 'pm25_health_corr' },
              { label: 'Δ PM2.5 vs Δ Health burden', key: 'delta_pm25_delta_health_corr' },
            ].map((item) => (
              <article key={item.key} className="correlation-card">
                <p className="label">{item.label}</p>
                <h3>{formatNumber(correlations[item.key], 2)}</h3>
              </article>
            ))}
          </div>
          <div className="model-metrics">
            {[
              { label: 'R²', key: 'r2' },
              { label: 'RMSE', key: 'rmse' },
              { label: 'MAE', key: 'mae' },
            ].map((metric) => (
              <div key={metric.key} className="metric-chip">
                <p>{metric.label}</p>
                <span>{formatNumber(modelMetrics?.metrics ? modelMetrics.metrics[metric.key] : modelMetrics[metric.key], metric.key === 'r2' ? 3 : 2)}</span>
              </div>
            ))}
          </div>
          <div className="panel__body">
            <h3 className="subheading">Pollutant correlation matrix</h3>
            <Plot
              data={heatmapTrace}
              layout={{ template: 'plotly_dark', margin: { t: 20, r: 20, b: 60, l: 60 } }}
              className="plot"
              useResizeHandler
              style={{ width: '100%', height: '420px' }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
