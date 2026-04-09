interface ScheduleErrorProps {
  message: string;
}

export function ScheduleError({ message }: ScheduleErrorProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
      <p className="font-medium">Could not load the MLB schedule.</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}