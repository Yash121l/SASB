import { NavLink, Route, Routes } from 'react-router-dom';

import Dashboard from './pages/Dashboard.jsx';
import PolicyLab from './pages/PolicyLab.jsx';
import Resources from './pages/Resources.jsx';
import ClusteringAnalysis from './pages/ClusteringAnalysis.jsx';

const navLinks = [
  { to: '/', label: 'Insights' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/policy', label: 'Policy Lab' },
  { to: '/resources', label: 'Research Hub' },
];

export default function App() {
  return (
    <div className="layout">
      <header className="top-nav">
        <div className="brand">
          <span className="brand__chip">SASB</span>
          <div>
            <p className="eyebrow">Global Air Quality & Pollution Trends</p>
            <h1>Air Quality Intelligence Initiative</h1>
          </div>
        </div>
        <nav>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<ClusteringAnalysis />} />
          <Route path="/policy" element={<PolicyLab />} />
          <Route path="/resources" element={<Resources />} />
        </Routes>
      </main>
      <footer>
        Built with ❤️ using React + FastAPI · <a href="../docs/deployment.md" target="_blank">By Team SASB</a>
      </footer>
    </div>
  );
}
