import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { apiGet } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Need to create Badge, or just use tailwind

export default function ClusteringAnalysis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Static mode: We only have k=4 exported.
    const nClusters = 4;

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Fetch the static export which corresponds to k=4
                const clusterResult = await apiGet('/api/analysis/clustering');
                setData(clusterResult);
            } catch (error) {
                console.error("Failed to load analysis data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading Analysis...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load analysis data.</div>;

    const traces = [];
    
    // K-Means Traces (Static)
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Clustering Analysis</h1>
                <p className="text-muted-foreground">
                    Unsupervised learning to identify global pollution patterns. (Static k=4 visualization).
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>3D Feature Space</CardTitle>
                        <CardDescription>GDP vs Urbanization vs PM2.5</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[500px]">
                        <Plot
                            data={traces}
                            layout={{
                                autosize: true,
                                paper_bgcolor: 'rgba(0,0,0,0)',
                                plot_bgcolor: 'rgba(0,0,0,0)',
                                scene: {
                                    xaxis: { title: 'GDP ($)', backgroundcolor: 'rgba(0,0,0,0)' },
                                    yaxis: { title: 'Urban (%)', backgroundcolor: 'rgba(0,0,0,0)' },
                                    zaxis: { title: 'PM2.5', backgroundcolor: 'rgba(0,0,0,0)' },
                                },
                                margin: { l: 0, r: 0, b: 0, t: 0 },
                                legend: { x: 0, y: 1 }
                            }}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>About K-Means</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                We used K-Means to partition countries into 4 distinct clusters based on their socioeconomic and environmental profiles.
                                This helps identify common developmental trajectories and their associated air quality outcomes.
                            </p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                         <CardHeader>
                            <CardTitle>Cluster Profiles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {data.centers.map((center, idx) => {
                                 // Simple heuristic for interpretation
                                const gdpLevel = center.gdp_per_capita_constant_2015usd > 20000 ? "High Income" : (center.gdp_per_capita_constant_2015usd > 5000 ? "Middle Income" : "Low Income");
                                const pollutionLevel = center.pm25_exposure > 35 ? "High Pollution" : (center.pm25_exposure > 12 ? "Mod. Pollution" : "Low Pollution");
                                
                                return (
                                    <div key={idx} className="flex flex-col space-y-1 p-3 rounded-lg border bg-muted/40">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-sm">Cluster {center.cluster_id + 1}</span>
                                            <span className="text-xs text-muted-foreground">{center.size} countries</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {gdpLevel} · {pollutionLevel}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t text-xs">
                                            <div>
                                                <span className="block text-muted-foreground">GDP</span>
                                                <span className="font-medium">${(center.gdp_per_capita_constant_2015usd/1000).toFixed(1)}k</span>
                                            </div>
                                            <div>
                                                <span className="block text-muted-foreground">Urb</span>
                                                 <span className="font-medium">{center.urban_population_pct.toFixed(0)}%</span>
                                            </div>
                                             <div>
                                                <span className="block text-muted-foreground">PM2.5</span>
                                                 <span className="font-medium">{center.pm25_exposure.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
