export default function ChartCard({ title, children, actions }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="subheading">{title}</p>
        </div>
        {actions}
      </div>
      <div className="panel__body">{children}</div>
    </section>
  );
}
