import { useEffect, useState } from 'react';

import Hero from '../components/Hero.jsx';
import { apiGet } from '../lib/api.js';

const researchPapers = [
  {
    title: 'Air Pollution Exposure Inequality in the Sahel (World Bank, 2023)',
    url: 'https://openknowledge.worldbank.org/entities/publication/d25b04f0-429d-5cb5-90ee-351e58c7cff6',
    summary: 'Explains why Sahelian countries stagnated despite economic liberalisation – referenced in our regional storyline.',
  },
  {
    title: 'Seasonal Inversions & Winter Smog over Indo-Gangetic Plain (IIT Kanpur, 2021)',
    url: 'https://dst.gov.in/sites/default/files/EXECUTIVE%20SUMMARY%20IGP.pdf',
    summary: 'Supports the seasonal fingerprint section where winter spikes reach 2.4× summer levels.',
  },
  {
    title: 'Urbanisation, Structural Transformation and Air Quality (OECD, 2022)',
    url: 'https://www.oecd.org/environment/urbanisation-structural-transformation-and-air-quality.htm',
    summary: 'Used to interpret the negative correlation between high urban shares and PM2.5 after service-driven transitions.',
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
        <div className="panel__body resource-grid">
          {researchPapers.map((paper) => (
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
      </section>
    </>
  );
}
