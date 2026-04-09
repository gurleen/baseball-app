interface HomeHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshedLabel: string | null;
}

export function HomeHeader({ onRefresh, isRefreshing, lastRefreshedLabel }: HomeHeaderProps) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-4xl font-semibold text-neutral-950">Today&apos;s Games</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {lastRefreshedLabel ? `Last refreshed at ${lastRefreshedLabel}` : "Waiting for first refresh..."}
        </p>
      </div>

      <button
        aria-busy={isRefreshing}
        className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 hover:text-neutral-950"
        disabled={isRefreshing}
        onClick={onRefresh}
        type="button"
      >
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </header>
  );
}