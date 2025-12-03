import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { apiGet } from '../lib/api';

export default function ClusteringAnalysis() {
    const [data, setData] = useState(null);
    const [elbowData, setElbowData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState('kmeans'); // 'kmeans' or 'dbscan'

    // K-Means params
    const [nClusters, setNClusters] = useState(4);

    // DBSCAN params
    const [eps, setEps] = useState(0.5);
    const [minSamples, setMinSamples] = useState(5);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                let clusterResult;
                if (method === 'kmeans') {
                    clusterResult = await apiGet('/api/analysis/clustering', { n_clusters: nClusters });
                } else {
                    clusterResult = await apiGet('/api/analysis/dbscan', { eps, min_samples: minSamples });
                }

                // Always load elbow data for reference, or only when in kmeans mode? 
                // Let's load it once or when switching to kmeans.
                let elbowResult = elbowData;
                if (!elbowData) {
                    elbowResult = await apiGet('/api/analysis/elbow');
                    setElbowData(elbowResult);
                }

                setData(clusterResult);
            } catch (error) {
                console.error("Failed to load analysis data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [method, nClusters, eps, minSamples]);

    if (loading && !data) return <div className="loading">Generating Analysis...</div>;
    if (!data) return <div className="error">Failed to load analysis.</div>;

    const traces = [];

    if (method === 'kmeans') {
        // K-Means Traces
        for (let i = 0; i < nClusters; i++) {
            const clusterPoints = data.data.filter(d => d.cluster === i);
            traces.push({
                x: clusterPoints.map(d => d.gdp_per_capita_constant_2015usd),
                y: clusterPoints.map(d => d.urban_population_pct),
                z: clusterPoints.map(d => d.pm25_exposure),
                mode: 'markers',
                type: 'scatter3d',
                name: `Cluster ${i + 1}`,
                text: clusterPoints.map(d => `${d.country_name}<br>PM2.5: ${d.pm25_exposure.toFixed(1)}`),
                marker: { size: 4, opacity: 0.8 }
            });
        }
        // Centroids
        traces.push({
            x: data.centers.map(c => c.gdp_per_capita_constant_2015usd),
            y: data.centers.map(c => c.urban_population_pct),
            z: data.centers.map(c => c.pm25_exposure),
            mode: 'markers',
            type: 'scatter3d',
            name: 'Centroids',
            marker: { size: 10, color: 'black', symbol: 'diamond' }
        });
    } else {
        // DBSCAN Traces
        const uniqueClusters = [...new Set(data.data.map(d => d.cluster))].sort((a, b) => a - b);

        uniqueClusters.forEach(clusterId => {
            const points = data.data.filter(d => d.cluster === clusterId);
            const isNoise = clusterId === -1;

            traces.push({
                x: points.map(d => d.gdp_per_capita_constant_2015usd),
                y: points.map(d => d.urban_population_pct),
                z: points.map(d => d.pm25_exposure),
                mode: 'markers',
                type: 'scatter3d',
                name: isNoise ? 'Noise (Outliers)' : `Cluster ${clusterId}`,
                text: points.map(d => `${d.country_name}<br>PM2.5: ${d.pm25_exposure.toFixed(1)}`),
                marker: {
                    size: isNoise ? 3 : 4,
                    opacity: isNoise ? 0.5 : 0.8,
                    color: isNoise ? 'red' : undefined,
                    symbol: isNoise ? 'cross' : 'circle'
                }
            });
        });
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <h2>Advanced Clustering Analysis</h2>
                <p>Compare K-Means (Partitioning) and DBSCAN (Density-Based) clustering.</p>
            </header>

            <div className="analysis-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="main-chart">
                    <div className="controls" style={{ marginBottom: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px', color: 'black' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ marginRight: '1rem' }}><strong>Method:</strong></label>
                            <label style={{ marginRight: '1rem' }}>
                                <input
                                    type="radio"
                                    value="kmeans"
                                    checked={method === 'kmeans'}
                                    onChange={() => setMethod('kmeans')}
                                /> K-Means
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    value="dbscan"
                                    checked={method === 'dbscan'}
                                    onChange={() => setMethod('dbscan')}
                                /> DBSCAN
                            </label>
                        </div>

                        {method === 'kmeans' ? (
                            <div>
                                <label>Number of Clusters (k): </label>
                                <select value={nClusters} onChange={(e) => setNClusters(Number(e.target.value))}>
                                    {[2, 3, 4, 5, 6, 7, 8].map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div>
                                    <label title="Maximum distance between two samples for one to be considered as in the neighborhood of the other.">
                                        Epsilon (eps): <strong>{eps}</strong>
                                    </label>
                                    <br />
                                    <input
                                        type="range" min="0.1" max="3.0" step="0.1"
                                        value={eps}
                                        onChange={(e) => setEps(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label title="The number of samples (or total weight) in a neighborhood for a point to be considered as a core point.">
                                        Min Samples: <strong>{minSamples}</strong>
                                    </label>
                                    <br />
                                    <input
                                        type="range" min="2" max="20" step="1"
                                        value={minSamples}
                                        onChange={(e) => setMinSamples(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="chart-container" style={{ height: '600px', background: 'white', borderRadius: '8px', padding: '1rem' }}>
                        <Plot
                            data={traces}
                            layout={{
                                autosize: true,
                                scene: {
                                    xaxis: { title: 'GDP per Capita ($)' },
                                    yaxis: { title: 'Urban Pop (%)' },
                                    zaxis: { title: 'PM2.5 Exposure' },
                                },
                                margin: { l: 0, r: 0, b: 0, t: 0 },
                                legend: { x: 0, y: 1 }
                            }}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>

                <div className="sidebar">
                    {method === 'kmeans' && elbowData && (
                        <div className="elbow-chart" style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <h3>Elbow Method</h3>
                            <p className="small">Use this to find the optimal <em>k</em>.</p>
                            <Plot
                                data={[{
                                    x: elbowData.k,
                                    y: elbowData.inertia,
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    marker: { color: '#8884d8' },
                                }]}
                                layout={{
                                    autosize: true,
                                    height: 250,
                                    margin: { l: 40, r: 20, b: 30, t: 10 },
                                    xaxis: { title: 'k' },
                                    yaxis: { title: 'Inertia' },
                                    shapes: [{
                                        type: 'line',
                                        x0: nClusters, x1: nClusters,
                                        y0: 0, y1: Math.max(...elbowData.inertia),
                                        line: { color: 'red', width: 1, dash: 'dot' }
                                    }]
                                }}
                                useResizeHandler={true}
                                style={{ width: '100%' }}
                                onClick={(data) => {
                                    if (data.points && data.points[0]) {
                                        setNClusters(data.points[0].x);
                                    }
                                }}
                            />
                        </div>
                    )}

                    <div className="analysis-notes">
                        <h3>Interpretation</h3>
                        {method === 'kmeans' ? (
                            <p>K-Means partitions data into <em>k</em> distinct clusters. It assumes clusters are spherical and equal size.</p>
                        ) : (
                            <div>
                                <p><strong>DBSCAN</strong> groups points that are closely packed together.</p>
                                <ul>
                                    <li><strong>Clusters:</strong> Dense regions.</li>
                                    <li><strong>Noise (Red Crosses):</strong> Outliers in low-density regions.</li>
                                </ul>
                                <p>Adjust <strong>eps</strong> (distance) and <strong>min_samples</strong> to find meaningful structures.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cluster Insights Table */}
            <div className="insights-section" style={{ marginTop: '2rem', background: 'white', padding: '1.5rem', borderRadius: '8px', color: 'black' }}>
                <h3>Cluster Insights</h3>
                <p>Average socioeconomic and environmental profiles for each cluster.</p>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Cluster</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Count</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Avg GDP ($)</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Avg Urban %</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Avg PM2.5</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Interpretation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.centers.map((center, idx) => {
                                const isNoise = center.cluster_id === -1;
                                const label = isNoise ? 'Noise (Outliers)' : `Cluster ${center.cluster_id + 1}`;

                                // Simple heuristic for interpretation
                                let profile = "";
                                if (isNoise) {
                                    profile = "Anomalies / Outliers";
                                } else {
                                    const gdpLevel = center.gdp_per_capita_constant_2015usd > 20000 ? "High Income" : (center.gdp_per_capita_constant_2015usd > 5000 ? "Middle Income" : "Low Income");
                                    const pollutionLevel = center.pm25_exposure > 35 ? "High Pollution" : (center.pm25_exposure > 12 ? "Moderate Pollution" : "Low Pollution");
                                    profile = `${gdpLevel}, ${pollutionLevel}`;
                                }

                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '0.75rem', fontWeight: 'bold', color: isNoise ? 'red' : 'inherit' }}>{label}</td>
                                        <td style={{ padding: '0.75rem' }}>{center.size}</td>
                                        <td style={{ padding: '0.75rem' }}>${center.gdp_per_capita_constant_2015usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td style={{ padding: '0.75rem' }}>{center.urban_population_pct.toFixed(1)}%</td>
                                        <td style={{ padding: '0.75rem' }}>{center.pm25_exposure.toFixed(1)}</td>
                                        <td style={{ padding: '0.75rem', fontStyle: 'italic' }}>{profile}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
