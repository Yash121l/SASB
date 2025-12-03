export default function Hero({ title, subtitle, description, actions = [] }) {
  return (
    <section className="hero">
      <div className="hero__glow"></div>
      <div className="hero__content">
        <p className="eyebrow">Project · Interactive intelligence</p>
        <h2>{title}</h2>
        {subtitle && <p className="hero__subtitle">{subtitle}</p>}
        {description && <p className="lede">{description}</p>}
        {actions.length > 0 && (
          <div className="hero__actions">
            {actions.map((action) => (
              <button key={action.label} onClick={action.onClick} type="button">
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
