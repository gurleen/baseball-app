import type { ScheduleDate } from "../../types/schedule";
import { ScheduleGameCard } from "./ScheduleGameCard";

interface ScheduleGameGridProps {
  dateEntry: ScheduleDate;
}

export function ScheduleGameGrid({ dateEntry }: ScheduleGameGridProps) {
  const games = dateEntry.games;
  const todayHasGames = games.length > 0;

  if (!todayHasGames) {
    return (
      <p className="text-neutral-600">No games are scheduled for this date.</p>
    );
  }

  return (
    <section className="space-y-4 rounded">
      <div className="text-sm text-neutral-500">
        {dateEntry.totalGames} game{dateEntry.totalGames === 1 ? "" : "s"} on {dateEntry.date}
      </div>
      <div className="flex flex-wrap gap-4">
        {games.map(game => (
          <ScheduleGameCard game={game} key={game.gamePk} />
        ))}
      </div>
    </section>
  );
}