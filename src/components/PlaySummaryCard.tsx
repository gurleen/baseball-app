import clsx from "clsx";
import { PlayerImage } from "@/components/PlayerImg";

interface PlaySummaryCardProps {
	badgeLabel: string;
	description: string;
	playerId?: number;
	className?: string;
	badgeClassName?: string;
	fallbackAvatarClassName?: string;
}

export default function PlaySummaryCard({
	badgeLabel,
	description,
	playerId,
	className,
	badgeClassName,
	fallbackAvatarClassName,
}: PlaySummaryCardProps) {
	return (
		<div className={clsx("rounded-lg border px-3 py-3 shadow-sm", className)}>
			<div className="flex items-start gap-3">
				{typeof playerId === "number" ? (
					<PlayerImage playerId={playerId} size={50} />
				) : (
					<div className={clsx("h-12.5 w-12.5 rounded-full bg-slate-200", fallbackAvatarClassName)} />
				)}
				<div className="min-w-0 flex-1">
					<span className={clsx("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white", badgeClassName)}>
						{badgeLabel}
					</span>
					<p className="mt-2 text-sm leading-5 text-slate-700">{description}</p>
				</div>
			</div>
		</div>
	);
}