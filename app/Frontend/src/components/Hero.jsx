export default function Hero({ title, subtitle, description }) {
  return (
    <div className="relative isolate overflow-hidden bg-background py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <p className="text-base font-semibold leading-7 text-primary">Project · Interactive intelligence</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">{title}</h2>
          {subtitle && (
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              {subtitle}
            </p>
          )}
          {description && (
             <p className="mt-4 text-base leading-7 text-muted-foreground/80">
              {description}
             </p>
          )}
        </div>
      </div>
    </div>
  );
}
