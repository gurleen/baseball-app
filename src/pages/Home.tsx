import { useInterval } from "usehooks-ts";
import { HomeHeader } from "../components/home/HomeHeader";
import { ScheduleError } from "../components/home/ScheduleError";
import { ScheduleGameGrid } from "../components/home/ScheduleGameGrid";
import { useSchedule } from "../hooks/useSchedule";

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatRefreshTime(lastUpdatedAt: Date | null) {
  if (!lastUpdatedAt) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(lastUpdatedAt);
}

export default function Home() {
  const today = todayString();

  const { data, error, isLoading, isRefreshing, lastUpdatedAt, refetch } = useSchedule({
    startDate: today,
    endDate: today,
  });

  const dateEntry = data?.dates[0];
  const lastRefreshedLabel = formatRefreshTime(lastUpdatedAt);

  useInterval(refetch, 10 * 1000);

  return (
    <main className="h-full w-full md:py-10 md:px-10 border-2 border-neutral-200 bg-gray-500/10 drop-shadow-gray-900 drop-shadow-xl/40">
      <HomeHeader
        isRefreshing={isRefreshing}
        lastRefreshedLabel={lastRefreshedLabel}
        onRefresh={() => void refetch()}
      />

      {isLoading ? (
        <p className="text-neutral-600">Loading schedule...</p>
      ) : null}

      {error ? (
        <ScheduleError message={error.message} />
      ) : null}

      {!isLoading && dateEntry ? (
        <ScheduleGameGrid dateEntry={dateEntry} />
      ) : null}
    </main>
  );
}
