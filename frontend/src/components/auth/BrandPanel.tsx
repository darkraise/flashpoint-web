/**
 * BrandPanel - Desktop-only brand showcase panel with museum theme
 * Features: Large logo with float animation, stats counter, architectural grid overlay
 */
export function BrandPanel() {
  // Archive stats - could be fetched from API in the future
  const stats = [
    { label: 'Games Preserved', value: '200,000+' },
    { label: 'Animations Archived', value: '10,000+' },
    { label: 'Years of History', value: '25+' },
  ];

  return (
    <div className="hidden lg:flex lg:flex-col lg:justify-center lg:items-center lg:w-[60%] relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background backdrop-blur-[1px]">
      {/* Architectural grid overlay - very subtle */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      {/* Multi-layer gradient backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/3 to-primary/8 pointer-events-none" aria-hidden="true" />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center px-12 animate-fade-in-up">
        {/* Logo with float animation */}
        <div className="mb-8 w-40 h-40 flex items-center justify-center animate-float">
          <img
            src="/images/logo.png"
            alt="Flashpoint Archive Logo"
            className="w-full h-full object-contain drop-shadow-2xl"
          />
        </div>

        {/* Title and tagline */}
        <h1 className="text-5xl font-bold text-foreground mb-4 text-center tracking-tight">
          Flashpoint Archive
        </h1>
        <p className="text-xl text-muted-foreground mb-12 text-center max-w-md leading-relaxed">
          Preserving digital history, one game at a time
        </p>

        {/* Stats counter */}
        <div className="grid grid-cols-3 gap-8 w-full max-w-2xl">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex flex-col items-center p-6 rounded-lg bg-card/30 backdrop-blur-sm border border-border/50 shadow-lg"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both',
              }}
            >
              <div className="text-3xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground text-center">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
