export default function AppLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="page-shell py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-14 rounded-2xl bg-white/70" />
          <div className="grid gap-4 lg:grid-cols-[250px,1fr]">
            <div className="h-80 rounded-2xl bg-white/70" />
            <div className="space-y-4">
              <div className="h-16 rounded-3xl bg-white/70" />
              <div className="h-48 rounded-3xl bg-white/70" />
              <div className="h-48 rounded-3xl bg-white/70" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
