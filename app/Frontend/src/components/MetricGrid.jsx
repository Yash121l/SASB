export default function MetricGrid({ metrics }) {
  return (
    <div className="metrics">
      {metrics.map((metric) => (
        <article key={metric.label} className="metric-card">
          <p className="label">{metric.label}</p>
          <h3>{metric.value}</h3>
          <p className="value">{metric.helper}</p>
        </article>
      ))}
    </div>
  );
}
