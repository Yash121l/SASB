import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Github, Database, Code, LineChart, Server } from 'lucide-react';

export default function Showcase() {
  const steps = [
    {
      title: 'Data Collection',
      icon: Database,
      description: 'We aggregated over 15 years of air quality data (OpenAQ) combined with World Bank socioeconomic indicators (GDP, Urbanization, Health Burden). Python scripts automated the retrieval and initial validation of millions of data points.',
    },
    {
      title: 'Processing & Engineering',
      icon: Code,
      description: 'Raw data changed into analytical gold. We handled missing values, engineered features like "Year-over-Year Delta" and "Rolling Means", and aligned disparate temporal resolutions using Pandas and NumPy.',
    },
    {
      title: 'Analysis & Modeling',
      icon: Server,
      description: 'Using Scikit-Learn, we built Random Forest regressors to predict PM2.5 levels based on socioeconomic factors. We also applied K-Means and DBSCAN clustering to identify global pollution patterns and regional fingerprints.',
    },
    {
      title: 'Visualization & Deployment',
      icon: LineChart,
      description: 'The insights are delivered via this interactive React dashboard, powered by a FastAPI backend (now static for portability). We use Plotly for high-fidelity, interactive charts that allow deep exploration of the data.',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Our Research Process</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          From raw data to actionable intelligence. Here's how we built the SASB Air Quality Initiative.
        </p>
        <Button size="lg" className="gap-2" asChild>
          <a href="https://github.com/Yash121l/SASB" target="_blank" rel="noopener noreferrer">
            <Github className="h-5 w-5" />
            Explore the Code
          </a>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <Card key={index} className="border-t-4 border-t-primary">
            <CardHeader>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-6 w-6" />
              </div>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base text-foreground/80">
                {step.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
            <CardDescription>Built with modern, robust technologies.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">Frontend</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>React 18 & Vite</li>
                <li>TailwindCSS & Shadcn UI</li>
                <li>Plotly.js for Visuals</li>
                <li>Lucide Icons</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">Backend & Data</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>FastAPI (Python)</li>
                <li>Pandas & NumPy</li>
                <li>Scikit-Learn (ML)</li>
                <li>Jupyter Notebooks</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Source</CardTitle>
            <CardDescription>Contribution & License</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              This project is open-source and available under the MIT License. We welcome contributions, feature requests, and bug reports on our GitHub repository.
            </p>
            <div className="flex gap-4">
               <a href="https://github.com/Yash121l/SASB/issues" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                Report an Issue
              </a>
               <a href="https://github.com/Yash121l/SASB/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                View License
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
