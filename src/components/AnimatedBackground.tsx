export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-primary/15 blur-[120px] animate-blob" />
      <div className="absolute -bottom-40 -right-32 h-[36rem] w-[36rem] rounded-full bg-[oklch(0.72_0.16_220)]/15 blur-[120px] animate-blob animation-delay-2000" />
      <div className="absolute top-1/3 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.15_295)]/12 blur-[120px] animate-blob animation-delay-4000" />
    </div>
  );
}
