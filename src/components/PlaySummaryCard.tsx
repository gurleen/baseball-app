import clsx from "clsx";
import { PlayerImage } from "@/components/PlayerImg";
import type { HitData } from "@/types/gumbo";

interface PlaySummaryCardProps {
    badgeLabel: string;
    description: string;
    playerId?: number;
    hitData?: HitData | null;
    className?: string;
    badgeClassName?: string;
    fallbackAvatarClassName?: string;
}

const formatHitMetric = (label: string, value: number | undefined, suffix: string) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }

    return `${label} ${Math.round(value)}${suffix}`;
};

export default function PlaySummaryCard({
    badgeLabel,
    description,
    playerId,
    hitData,
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
                    {hitData && <HitDataTable hitData={hitData} />}
                </div>
            </div>
        </div>
    );
}

const HitDataTable = ({ hitData }: { hitData: HitData }) => {
    const launchSpeed = (hitData?.launchSpeed ?? 0).toFixed(1);
    const launchAngle = (hitData?.launchAngle ?? 0).toFixed(1);
    const distance = Math.round(hitData?.totalDistance ?? 0);

    return (
        <table className="mt-2 text-center text-sm text-slate-500">
            <tbody>
                <tr>
                    <td className="px-2 font-medium bg-slate-900 text-white">EV</td>
                    <td className="px-2 underline">{launchSpeed} mph</td>
                    <td className="px-2 font-medium bg-slate-900 text-white">LA</td>
                    <td className="px-2 underline">{launchAngle} deg</td>
                    <td className="px-2 font-medium bg-slate-900 text-white">DIST</td>
                    <td className="px-2 underline">{distance} ft</td>
                </tr>
            </tbody>
        </table>
    )
}