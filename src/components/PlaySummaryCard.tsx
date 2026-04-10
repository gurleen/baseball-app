import { useState } from "react";
import clsx from "clsx";
import PitchSequenceTable from "@/components/PitchSequenceTable";
import { PlayerImage } from "@/components/PlayerImg";
import StrikeZone from "@/components/StrikeZone";
import type { HitData, MatchupPitch } from "@/types/gumbo";

interface PlaySummaryCardProps {
    badgeLabel: string;
    scorecardCode?: string;
    description: string;
    playerId?: number;
    hitData?: HitData | null;
    pitches?: MatchupPitch[];
    strikeZoneTop?: number;
    strikeZoneBottom?: number;
    className?: string;
    badgeClassName?: string;
    fallbackAvatarClassName?: string;
}

export default function PlaySummaryCard({
    badgeLabel,
    scorecardCode,
    description,
    playerId,
    hitData,
    pitches = [],
    strikeZoneTop,
    strikeZoneBottom,
    className,
    badgeClassName,
    fallbackAvatarClassName,
}: PlaySummaryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const canExpand = pitches.length > 0;
    const showStrikeZone = typeof strikeZoneTop === "number" && typeof strikeZoneBottom === "number";

    return (
        <div className={clsx("rounded-lg border px-3 py-3 shadow-sm", className)}>
            <div className="flex items-start gap-3">
                {typeof playerId === "number" ? (
                    <PlayerImage playerId={playerId} size={50} />
                ) : (
                    <div className={clsx("h-12.5 w-12.5 rounded-full bg-slate-200", fallbackAvatarClassName)} />
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white", badgeClassName)}>
                            {badgeLabel}
                        </span>
                        {scorecardCode && (
                            <span className="inline-flex bg-white px-2.5 py-1 text-[16px] font-semibold uppercase tracking-[0.12em] text-slate-700 font-handwritten">
                                {scorecardCode}
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm leading-5 text-slate-700">{description}</p>
                    {hitData && <HitDataTable hitData={hitData} />}
                </div>
                {canExpand && (
                    <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse plate appearance details" : "Expand plate appearance details"}
                        onClick={() => setIsExpanded((expanded) => !expanded)}
                        className="ms-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                    >
                        <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={clsx("h-4 w-4 transition-transform", isExpanded && "rotate-90")}
                        >
                            <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
            </div>
            {canExpand && isExpanded && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                        {showStrikeZone && (
                            <StrikeZone
                                strikeZoneTop={strikeZoneTop}
                                strikeZoneBottom={strikeZoneBottom}
                                pitches={pitches}
                                width={160}
                                className="shrink-0 border border-slate-300 bg-white/60"
                            />
                        )}
                        <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-slate-200 bg-white/70">
                            <PitchSequenceTable pitches={pitches} compact />
                        </div>
                    </div>
                </div>
            )}
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