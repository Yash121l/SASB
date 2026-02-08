import { useEffect, useMemo, useState } from 'react';
import Hero from '../components/Hero.jsx';
import { apiGet, formatNumber } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider"; // Need to create Slider or use native input styled

// Basic Linear Regression Predictor logic
const predictPM25 = (coeffs, inputs) => {
    if (!coeffs) return null;
    const { intercept, coefficients } = coeffs;
    // Feature order: [gdp_per_capita, urban_population_pct, communicable_disease_death_pct]
    // Warning: Must match the order in export_static_api.py
    const x = [inputs.gdp, inputs.urban, inputs.health];
    
    let y = intercept;
    for (let i = 0; i < coefficients.length; i++) {
        y += coefficients[i] * x[i];
    }
    return y;
};

const categorisePM25 = (value) => {
    if (value < 12) return "Good";
    if (value < 35) return "Moderate";
    if (value < 55) return "Unhealthy for Sensitive Groups";
    if (value < 150) return "Unhealthy";
    return "Hazardous";
};

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function PolicyLab() {
  const [meta, setMeta] = useState(null);
  const [inputs, setInputs] = useState({ gdp: 10000, urban: 50, health: 10 });
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    // Load metadata for defaults
    apiGet('/api/meta').then((payload) => {
      setMeta(payload);
      const defaults = payload.policy_defaults;
      setInputs({
        gdp: defaults.gdp_per_capita,
        urban: defaults.urban_population_pct,
        health: defaults.communicable_disease_death_pct,
      });
    });

    // Load exported model coefficients
    fetch('/data/policy-model.json')
        .then(res => res.json())
        .then(setModel)
        .catch(err => console.error("Failed to load policy model:", err));
  }, []);

  useEffect(() => {
    if (!model || !inputs) return;
    
    const predValue = predictPM25(model, inputs);
    setPrediction({
        predicted_pm25: predValue.toFixed(2),
        category: categorisePM25(predValue),
        guidance: "Estimates derived from linearised socioeconomic relationships (Static Model)."
    });
  }, [inputs, model]);

  const stats = model?.stats || { min: { gdp: 0 }, max: { gdp: 100000 } }; // Fallback

  const sliders = useMemo(() => {
      // Use model stats if available for ranges
      return {
          gdp: {
              min: 1000,
              max: 60000,
              step: 250
          },
          urban: {
              min: 10,
              max: 100,
              step: 1
          },
          health: {
              min: 0,
              max: 40,
              step: 0.5
          }
      };
  }, []); // Could depend on model stats but hardcoded ranges are safer for UI

  const cards = [
    {
      key: 'gdp',
      label: 'GDP per Capita',
      helper: '$1k – $60k',
      description: 'Economic output per person (2015 USD).',
      value: formatter.format(inputs.gdp || 0),
    },
    {
      key: 'urban',
      label: 'Urban Population',
      helper: 'Share of people living in cities',
      description: 'Urban density impact on exposure.',
      value: `${formatNumber(inputs.urban, 0)}%`,
    },
    {
      key: 'health',
      label: 'Communicable Disease',
      helper: '% of total deaths',
      description: 'Proxy for health infrastructure.',
      value: `${formatNumber(inputs.health, 1)}%`,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Hero
        title="Policy Simulator"
        subtitle="Adjust socioeconomic drivers to simulate PM2.5 outcomes"
        description="Linearized prediction model running entirely in your browser."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Policy Parameters</CardTitle>
                <CardDescription>Adjust sliders to see impact.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {cards.map((card) => {
                    const range = sliders[card.key] || { min: 0, max: 100, step: 1 };
                    return (
                        <div key={card.key} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{card.label}</label>
                                    <p className="text-[0.8rem] text-muted-foreground">{card.description}</p>
                                </div>
                                <span className="font-bold font-mono">{card.value}</span>
                            </div>
                            <input
                                type="range"
                                min={range.min}
                                max={range.max}
                                step={range.step}
                                value={inputs[card.key] ?? range.min}
                                onChange={(e) => setInputs(prev => ({ ...prev, [card.key]: Number(e.target.value) }))}
                                className="flex h-2 w-full rounded-lg appearance-none bg-muted accent-primary cursor-pointer"
                            />
                        </div>
                    )
                })}
            </CardContent>
        </Card>

        <div className="space-y-6">
             <Card className="bg-primary text-primary-foreground border-primary">
                <CardHeader>
                    <CardTitle className="text-primary-foreground">Predicted Impact</CardTitle>
                    <CardDescription className="text-primary-foreground/80">Estimated Annual Mean PM2.5</CardDescription>
                </CardHeader>
                <CardContent>
                     {prediction ? (
                        <div className="space-y-4">
                            <div className="text-6xl font-bold tracking-tighter">
                                {prediction.predicted_pm25} <span className="text-2xl font-normal opacity-80">µg/m³</span>
                            </div>
                             <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-background text-primary hover:bg-background/80">
                                {prediction.category}
                            </div>
                            <p className="text-sm opacity-90">{prediction.guidance}</p>
                        </div>
                     ) : (
                         <div className="text-center py-8 opacity-80">Loading Model...</div>
                     )}
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}
