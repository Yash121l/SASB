import { useEffect, useMemo, useState } from 'react';

import Hero from '../components/Hero.jsx';
import { apiGet, formatNumber } from '../lib/api.js';

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function PolicyLab() {
  const [meta, setMeta] = useState(null);
  const [inputs, setInputs] = useState({ gdp: 10000, urban: 50, health: 10 });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/meta').then((payload) => {
      setMeta(payload);
      const defaults = payload.policy_defaults;
      setInputs({
        gdp: defaults.gdp_per_capita,
        urban: defaults.urban_population_pct,
        health: defaults.communicable_disease_death_pct,
      });
    });
  }, []);

  useEffect(() => {
    if (!inputs) return;
    setLoading(true);
    apiGet('/api/policy-simulate', {
      gdp_per_capita: inputs.gdp,
      urban_population_pct: inputs.urban,
      communicable_disease_death_pct: inputs.health,
    })
      .then((payload) => {
        setPrediction(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [inputs]);

  const sliders = useMemo(() => {
    if (!meta?.policy_stats) return {};
    const stats = meta.policy_stats;
    return {
      gdp: {
        label: 'GDP per Capita',
        min: Math.max(1000, Math.floor(stats.min.gdp_per_capita_constant_2015usd)),
        max: Math.min(60000, Math.ceil(stats.max.gdp_per_capita_constant_2015usd)),
        step: 250,
      },
      urban: {
        label: 'Urban Population',
        min: 10,
        max: 100,
        step: 1,
      },
      health: {
        label: 'Communicable Disease Deaths',
        min: 0,
        max: Math.min(40, Math.ceil(stats.max.communicable_disease_death_pct)),
        step: 0.5,
      },
    };
  }, [meta]);

  const cards = [
    {
      key: 'gdp',
      label: 'GDP per Capita',
      helper: '$1k – $60k',
      description: 'Economic output per person (2015 USD). Higher GDP often correlates with cleaner energy mixes.',
      value: formatter.format(inputs.gdp || 0),
    },
    {
      key: 'urban',
      label: 'Urban Population',
      helper: 'Share of people living in cities',
      description: 'Urban density can either heighten exposure or enable efficient transit & heating.',
      value: `${formatNumber(inputs.urban, 0)}%`,
    },
    {
      key: 'health',
      label: 'Communicable Disease Deaths',
      helper: 'Proxy for healthcare quality',
      description: 'Higher burden implies weaker health infrastructure and typically poorer air-quality responses.',
      value: `${formatNumber(inputs.health, 1)}%`,
    },
  ];

  return (
    <>
      <Hero
        title="Policy Parameters"
        subtitle="Adjust socioeconomic drivers to simulate PM2.5 outcomes"
        description="The simulator linearises our Random Forest insights so you can stress-test GDP growth, urbanisation, and health improvements."
      />

      <section className="panel">
        <div className="panel__header">
          <h2>Adjust socioeconomic drivers</h2>
        </div>
        <div className="panel__body policy-grid">
          {cards.map((card) => {
            const slider = sliders[card.key] || { min: 0, max: 100, step: 1 };
            return (
              <article key={card.key} className="policy-card">
                <header>
                  <p className="label">{card.label}</p>
                  <h3>{card.value}</h3>
                  <p className="value">{card.helper}</p>
                </header>
                <p className="policy-card__description">{card.description}</p>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={inputs[card.key] ?? slider.min}
                  onChange={(event) =>
                    setInputs((prev) => ({
                      ...prev,
                      [card.key]: Number(event.target.value),
                    }))
                }
              />
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Predicted Impact</h2>
          {prediction && <p className="label">Estimated annual mean PM2.5 exposure</p>}
        </div>
        <div className="panel__body prediction-card">
          {error && <p className="error">{error}</p>}
          {!error && (
            <>
              <div className="prediction-value">
                <span>{loading ? '…' : prediction ? prediction.predicted_pm25 : '--'}</span>
                <small>µg/m³</small>
              </div>
              <p className="prediction-category">{prediction?.category || 'Awaiting inputs'}</p>
              <p className="value">{prediction?.guidance}</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
