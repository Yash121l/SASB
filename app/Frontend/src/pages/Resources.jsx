import { useEffect, useState } from 'react';

import Hero from '../components/Hero.jsx';
import { apiGet } from '../lib/api.js';

const researchPapers = [
  {
    title: 'Global air quality inequality over 2000–2020 (Sager, 2025)',
    url: 'https://doi.org/10.1016/j.jeem.2024.103112',
    summary: 'Demonstrates global PM2.5 Gini Index rose from 0.30 to 0.35, introducing the "Choking Billion" concept – 1 billion people experiencing extreme pollution exposure.',
    category: 'Global Inequality'
  },
  {
    title: 'Global Inequality of PM2.5 Exposures and Ecological Possession (Xu et al., 2025)',
    url: 'https://www.nature.com/articles/s41612-025-00941-0',
    summary: 'Identifies dual pattern: 118 countries reduced intra-country inequalities while inter-country disparities widened significantly.',
    category: 'Global Inequality'
  },
  {
    title: 'Global Inequality of PM2.5 Exposure and Ecological Possession (Chen et al., 2025)',
    url: 'https://doi.org/10.34133/remotesensing.0446',
    summary: 'Develops Ecological Quality Possession Index integrating PM2.5, population, and ecological indices across 2001-2020.',
    category: 'Global Inequality'
  },
  {
    title: 'Spatiotemporal variations in global traffic-sourced PM2.5 (Yu et al., 2025)',
    url: 'https://www.sciencedirect.com/science/article/pii/S0160412025000011',
    summary: 'Reveals traffic pollution contributed 36% to global increasing PM2.5 trends, challenging Environmental Kuznets Curve hypothesis.',
    category: 'Global Inequality'
  },
  {
    title: 'State of Global Air Report 2024 (Health Effects Institute)',
    url: 'https://www.stateofglobalair.org/resources/report/state-global-air-report-2024',
    summary: 'Confirms 34% of world population lives in areas exceeding WHO interim air quality targets. Comprehensive global burden analysis.',
    category: 'Global Reports'
  },
  {
    title: 'World Air Quality Report 2024 (IQAir)',
    url: 'https://www.greenpeace.org/static/planet4-chile-stateless/2025/03/edf90b7a-2024_world_air_quality_report_vf.pdf',
    summary: 'Documents 99% of global population breathes polluted air; only 12 countries meet WHO guideline of 5.0 µg/m³.',
    category: 'Global Reports'
  },
  {
    title: 'WHO Ambient Air Quality Database (2023)',
    url: 'https://www.who.int/data/gho/data/themes/air-pollution',
    summary: 'Authoritative global air quality measurements database used for establishing health guidelines and exposure thresholds.',
    category: 'Global Reports'
  },
  {
    title: 'World Air Quality Report 2024 Analysis (Drishti IAS)',
    url: 'https://www.drishtiias.com/daily-updates/daily-news-analysis/world-air-quality-report-2024',
    summary: 'Policy-focused analysis identifying Chad, Bangladesh, Pakistan as most polluted by annual average PM2.5 levels.',
    category: 'Global Reports'
  },
  {
    title: 'Long-term exposure to ambient air pollution and cardiovascular disease (Wolf et al., 2022)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8988294/',
    summary: 'Establishes global tracking framework showing 171 countries exceed WHO guidelines. Europe/North America achieved 58-67% mortality reductions.',
    category: 'Health Studies'
  },
  {
    title: 'Spatial and Temporal Variability of PM2.5/PM10 Ratio (Xu et al., 2017)',
    url: 'https://aaqr.org/articles/aaqr-16-09-oa-0406.pdf',
    summary: 'Demonstrates PM concentrations change significantly across time/space, requiring systematic analysis of temporal and spatial distribution patterns.',
    category: 'Health Studies'
  },
];

export default function Resources() {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    apiGet('/api/resources').then((payload) => setResources(payload.data));
  }, []);

  return (
    <>
      <Hero
        title="Research & Reference Hub"
        subtitle="Map every dataset, figure, repository, and external citation"
        description="Use this page as a single source of truth for metadata, raw sources, documentation, and literature used in the project."
      />

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Source registry</p>
            <h2>Data assets & artefacts</h2>
          </div>
        </div>
        <div className="panel__body resource-grid">
          {resources.map((item) => (
            <article key={item.title} className="resource-card">
              <p className="label">{item.type}</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <a href={item.url} target="_blank" rel="noreferrer">
                Visit resource ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Literature stack</p>
            <h2>Research papers & policy briefs</h2>
          </div>
        </div>
        <div className="panel__body">
          {['Global Inequality', 'Global Reports', 'Health Studies'].map((category) => (
            <div key={category} style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#fff', fontSize: '1.25rem' }}>{category}</h3>
              <div className="resource-grid">
                {researchPapers
                  .filter((paper) => paper.category === category)
                  .map((paper) => (
                    <article key={paper.title} className="resource-card">
                      <p className="label">Research</p>
                      <h3>{paper.title}</h3>
                      <p>{paper.summary}</p>
                      <a href={paper.url} target="_blank" rel="noreferrer">
                        Read paper ↗
                      </a>
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
