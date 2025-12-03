import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { apiGet } from '../lib/api';

export default function ClusteringAnalysis() {
    const [data, setData] = useState(null);
    const [elbowData, setElbowData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nClusters, setNClusters] = useState(4);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [clusterResult, elbowResult] = await Promise.all([
                    apiGet('/api/analysis/clustering', { n_clusters: nClusters }),
                    apiGet('/api/analysis/elbow')
                ]);
                setData(clusterResult);
                setElbowData(elbowResult);
            } catch (error) {
                console.error("Failed to load analysis data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [nClusters]);

    if (loading) return <div className="loading">Generating Analysis...</div>;
    if (!data || !elbowData) return <div className="error">Failed to load analysis.</div>;

    const traces = [];

    // Create a trace for each cluster
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

    // Add cluster centers
    traces.push({
        x: data.centers.map(c => c.gdp_per_capita_constant_2015usd),
        y: data.centers.map(c => c.urban_population_pct),
        z: data.centers.map(c => c.pm25_exposure),
        mode: 'markers',
        type: 'scatter3d',
        name: 'Centroids',
        marker: { size: 10, color: 'black', symbol: 'diamond' }
    });

    return (
        <div className="page-container">
            <header className="page-header">
                <h2>Socioeconomic Clustering Analysis (K-Means)</h2>
                <p>Grouping countries based on GDP, Urbanization, and Pollution levels.</p>
            </header>

            <div className="analysis-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="main-chart">
                    <div className="controls" style={{ marginBottom: '1rem' }}>
                        <label>Number of Clusters (k): </label>
                        <select value={nClusters} onChange={(e) => setNClusters(Number(e.target.value))}>
                            {[2, 3, 4, 5, 6, 7, 8].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
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
                    <div className="elbow-chart" style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <h3>Elbow Method</h3>
                        <p className="small">Use this to find the optimal <em>k</em>. Look for the "elbow" where the curve bends.</p>
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
                                height: 300,
                                margin: { l: 40, r: 20, b: 40, t: 20 },
                                xaxis: { title: 'Number of Clusters (k)' },
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

                    <div className="analysis-notes">
                        <h3>Interpretation</h3>
                        <ul>
                            <li><strong>X-Axis:</strong> Economic Development (GDP per Capita)</li>
                            <li><strong>Y-Axis:</strong> Urbanization Level</li>
                            <li><strong>Z-Axis:</strong> Air Pollution (PM2.5)</li>
                        </ul>
                        <p>Clusters typically reveal patterns such as "High Income, Low Pollution" vs "Developing, High Pollution".</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
