import clsx from "clsx";
import { useState } from "react";
import { useInterval } from "usehooks-ts";
import { HomeHeader } from "../components/home/HomeHeader";
import { ScheduleError } from "../components/home/ScheduleError";
import { ScheduleGameGrid } from "../components/home/ScheduleGameGrid";
import { useSchedule } from "../hooks/useSchedule";

function todayString() {
  const now = new Date();

  return toDateString(now);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateString(value: string) {
  const [yearText, monthText, dayText] = value.split("-");

  if (!yearText || !monthText || !dayText) {
    return null;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function shiftDateString(value: string, days: number) {
  const nextDate = parseDateString(value) ?? new Date();

  nextDate.setDate(nextDate.getDate() + days);

  return toDateString(nextDate);
}

function formatCalendarDate(value: string) {
  const date = parseDateString(value) ?? new Date();

  return {
    month: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(date),
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
  };
}

function formatViewedDate(value: string) {
  const date = parseDateString(value) ?? new Date();

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

interface DateTileProps {
  dateString: string;
  isSelected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function DateTile({ dateString, isSelected = false, disabled = false, onClick }: DateTileProps) {
  const { month, day, weekday } = formatCalendarDate(dateString);

  return (
    <button
      className={clsx(
        "flex min-w-24 flex-col overflow-hidden rounded-xl border bg-white/90 text-left font-mono transition hover:cursor-pointer",
        isSelected && "border-neutral-950 shadow-lg shadow-neutral-900/15",
        !isSelected && "border-neutral-300 hover:border-neutral-700 hover:bg-white",
        disabled && "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 hover:border-neutral-200 hover:bg-neutral-100",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={clsx("px-3 py-1 text-xs font-semibold tracking-[0.24em]", isSelected ? "bg-neutral-950 text-white" : "bg-neutral-200 text-neutral-700", disabled && "bg-neutral-200 text-neutral-400")}>
        {month}
      </span>
      <span className="px-3 pt-3 text-3xl font-semibold text-neutral-950">{day}</span>
      <span className="px-3 pb-3 text-xs uppercase tracking-[0.24em] text-neutral-500">{weekday}</span>
    </button>
  );
}

export default function Home() {
  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const scheduleDate = parseDateString(selectedDate) ? selectedDate : today;

  const { data, error, isLoading, isRefreshing, lastUpdatedAt, refetch } = useSchedule({
    startDate: scheduleDate,
    endDate: scheduleDate,
  });

  const dateEntry = data?.dates[0];
  const lastRefreshedLabel = formatRefreshTime(lastUpdatedAt);
  const previousDate = shiftDateString(scheduleDate, -1);
  const nextDate = shiftDateString(scheduleDate, 1);
  const canViewNextDate = scheduleDate < today;
  const viewedDateLabel = formatViewedDate(scheduleDate);

  useInterval(refetch, 10 * 1000);

  return (
    <main className="h-full w-full md:py-10 md:px-10 border-2 border-neutral-200 bg-gray-500/10 drop-shadow-gray-900 drop-shadow-xl/40">
      <HomeHeader
        isRefreshing={isRefreshing}
        lastRefreshedLabel={lastRefreshedLabel}
        onRefresh={() => void refetch()}
      />

      <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white/70 p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex gap-4 md:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <DateTile dateString={previousDate} onClick={() => setSelectedDate(previousDate)} />
            <DateTile dateString={selectedDate} isSelected onClick={() => setSelectedDate(selectedDate)} />
            <DateTile dateString={nextDate} disabled={!canViewNextDate} onClick={() => setSelectedDate(nextDate)} />
          </div>

          <label className="flex flex-col gap-2 text-sm font-mono text-neutral-700">
            Jump to an earlier date
            <input
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-950"
              max={today}
              onChange={event => {
                const nextValue = event.currentTarget.value;

                if (nextValue) {
                  setSelectedDate(nextValue);
                }
              }}
              type="date"
              value={scheduleDate}
            />
          </label>
        </div>
      </section>

      {isLoading ? (
        <p className="text-neutral-600">Loading schedule...</p>
      ) : null}

      {error ? (
        <ScheduleError message={error.message} />
      ) : null}

      {!isLoading && dateEntry ? (
        <ScheduleGameGrid dateEntry={dateEntry} viewedDateLabel={viewedDateLabel} />
      ) : null}

      {!isLoading && !error && !dateEntry ? (
        <p className="text-neutral-600">No schedule data is available for {viewedDateLabel}.</p>
      ) : null}
    </main>
  );
}
