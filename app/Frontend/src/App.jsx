import { Route, Routes } from 'react-router-dom';

import Dashboard from './pages/Dashboard.jsx';
import PolicyLab from './pages/PolicyLab.jsx';
import Resources from './pages/Resources.jsx';
import ClusteringAnalysis from './pages/ClusteringAnalysis.jsx';
import Showcase from './pages/Showcase.jsx';
import AppLayout from './components/AppLayout.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analysis" element={<ClusteringAnalysis />} />
        <Route path="/policy" element={<PolicyLab />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/process" element={<Showcase />} />
      </Route>
    </Routes>
  );
}
