import clsx from "clsx";
import { getPlayerFromGumbo, getPitchCodeFromName, type GumboFeed, type ReviewDetails } from "@/types/gumbo";
import { getLiveGamePanelId, getLiveGameTabId } from "./shared";

// A pitch "grazes" the zone when the ball's edge touches the plate's edge,
// so the effective half-width is plate half-width (8.5") plus ball radius (~1.45").
const BALL_RADIUS_INCHES = 1.45;
const STRIKE_ZONE_HALF_WIDTH_FEET = (17 / 2 + BALL_RADIUS_INCHES) / 12; // ~9.95 inches in feet

interface AbsChallenge {
    inning: number;
    halfInning: "top" | "bottom";
    batterId: number;
    callCode: string;
    pitchType?: string;
    startSpeed?: number;
    zone?: number;
    pX?: number;
    pZ?: number;
    strikeZoneTop?: number;
    strikeZoneBottom?: number;
    reviewDetails: ReviewDetails;
}

// Signed distance from the pitch to the nearest edge of the strike zone, in inches.
// Positive = inside the zone, negative = outside.
const distanceToZoneEdgeInches = (c: AbsChallenge): number | null => {
    const { pX, pZ, strikeZoneTop, strikeZoneBottom } = c;
    if (
        typeof pX !== "number" || typeof pZ !== "number" ||
        typeof strikeZoneTop !== "number" || typeof strikeZoneBottom !== "number"
    ) return null;

    // Signed margins on each axis — positive means inside on that axis.
    const horizMargin = STRIKE_ZONE_HALF_WIDTH_FEET - Math.abs(pX);
    const vertMargin = Math.min(pZ - strikeZoneBottom, strikeZoneTop - pZ);

    if (horizMargin >= 0 && vertMargin >= 0) {
        // Inside the zone: distance to the nearest edge.
        return Math.min(horizMargin, vertMargin) * 12;
    }
    if (horizMargin < 0 && vertMargin >= 0) {
        // Outside horizontally only.
        return horizMargin * 12;
    }
    if (horizMargin >= 0 && vertMargin < 0) {
        // Outside vertically only.
        return vertMargin * 12;
    }
    // Outside on both axes (corner miss) — Euclidean distance, negative.
    return -Math.sqrt(horizMargin * horizMargin + vertMargin * vertMargin) * 12;
};

const formatDistance = (inches: number | null): string => {
    if (inches === null) return "-";
    const sign = inches >= 0 ? "+" : "";
    return `${sign}${inches.toFixed(1)}"`;
};

const getAbsChallenges = (gameData: GumboFeed): AbsChallenge[] => {
    const challenges: AbsChallenge[] = [];

    for (const play of gameData.liveData.plays.allPlays) {
        // Pattern A: reviewDetails on an individual pitch event (older feed pattern)
        for (const event of play.playEvents) {
            if (!event.isPitch || !event.pitchData) continue;
            if (event.reviewDetails?.reviewType !== "MJ") continue;
            if (!event.details.call?.code) continue;
            challenges.push({
                inning: play.about.inning,
                halfInning: play.about.halfInning,
                batterId: play.matchup.batter.id,
                callCode: event.details.call.code,
                pitchType: event.details.type?.description,
                startSpeed: event.pitchData.startSpeed,
                zone: event.pitchData.zone,
                pX: event.pitchData.coordinates?.pX,
                pZ: event.pitchData.coordinates?.pZ,
                strikeZoneTop: event.pitchData.strikeZoneTop,
                strikeZoneBottom: event.pitchData.strikeZoneBottom,
                reviewDetails: event.reviewDetails,
            });
        }

        // Pattern B: reviewDetails on the play itself — challenged pitch is the last pitch
        if (play.reviewDetails?.reviewType === "MJ") {
            const pitchEvents = play.playEvents.filter((e) => e.isPitch && e.pitchData);
            const lastPitch = pitchEvents.at(-1);
            if (lastPitch?.pitchData && lastPitch.details.call?.code) {
                challenges.push({
                    inning: play.about.inning,
                    halfInning: play.about.halfInning,
                    batterId: play.matchup.batter.id,
                    callCode: lastPitch.details.call.code,
                    pitchType: lastPitch.details.type?.description,
                    startSpeed: lastPitch.pitchData.startSpeed,
                    zone: lastPitch.pitchData.zone,
                    pX: lastPitch.pitchData.coordinates?.pX,
                    pZ: lastPitch.pitchData.coordinates?.pZ,
                    strikeZoneTop: lastPitch.pitchData.strikeZoneTop,
                    strikeZoneBottom: lastPitch.pitchData.strikeZoneBottom,
                    reviewDetails: play.reviewDetails,
                });
            }
        }
    }

    return challenges;
};

const formatInning = (inning: number, halfInning: "top" | "bottom") =>
    `${halfInning === "top" ? "T" : "B"}${inning}`;

const formatUmpCall = (callCode: string) => {
    if (callCode === "C") return "Called Strike";
    if (callCode === "B") return "Called Ball";
    return callCode;
};

const formatZone = (zone?: number) => {
    if (typeof zone !== "number") return "-";
    if (zone >= 1 && zone <= 9) return "In";
    if (zone >= 11 && zone <= 14) return "Out";
    return "-";
};

const ChallengeCountCard = ({
    teamName,
    usedSuccessful,
    usedFailed,
    remaining,
}: {
    teamName: string;
    usedSuccessful: number;
    usedFailed: number;
    remaining: number;
}) => (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-300 bg-white/80 px-5 py-4 shadow-sm min-w-48">
        <p className="text-sm font-semibold text-slate-700">{teamName}</p>
        <div className="flex gap-4 text-sm">
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-bold text-slate-800">{remaining}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remaining</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-bold text-violet-700">{usedSuccessful}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overturned</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-bold text-slate-500">{usedFailed}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmed</span>
            </div>
        </div>
    </div>
);

export default function AbsTabPanel({ gameData }: { gameData: GumboFeed }) {
    const abs = gameData.gameData.absChallenges;
    const challenges = getAbsChallenges(gameData);
    const awayTeam = gameData.gameData.teams.away;
    const homeTeam = gameData.gameData.teams.home;

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("abs")}
            aria-labelledby={getLiveGameTabId("abs")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="flex flex-col gap-6">
                {abs && (
                    <div className="flex flex-wrap gap-4">
                        <ChallengeCountCard
                            teamName={awayTeam.name}
                            usedSuccessful={abs.away.usedSuccessful}
                            usedFailed={abs.away.usedFailed}
                            remaining={abs.away.remaining}
                        />
                        <ChallengeCountCard
                            teamName={homeTeam.name}
                            usedSuccessful={abs.home.usedSuccessful}
                            usedFailed={abs.home.usedFailed}
                            remaining={abs.home.remaining}
                        />
                    </div>
                )}

                {challenges.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 bg-slate-100 px-3 py-8 text-center text-sm text-slate-500">
                        No ABS challenges this game.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white/80 shadow-sm">
                        <table className="w-full table-fixed text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="w-14 px-3 py-2 font-semibold">Inn.</th>
                                    <th className="px-3 py-2 font-semibold">Batter</th>
                                    <th className="w-28 px-3 py-2 font-semibold">Ump Call</th>
                                    <th className="w-16 px-3 py-2 font-semibold">Zone</th>
                                    <th className="w-16 px-3 py-2 font-semibold">Miss</th>
                                    <th className="w-20 px-3 py-2 font-semibold">Type</th>
                                    <th className="w-16 px-3 py-2 font-semibold">Velo</th>
                                    <th className="w-28 px-3 py-2 font-semibold">ABS Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {challenges.map((c, i) => {
                                    const overturned = c.reviewDetails.isOverturned;
                                    const batter = getPlayerFromGumbo(gameData, c.batterId);
                                    const zone = formatZone(c.zone);
                                    const trueStrike = typeof c.zone === "number" && c.zone >= 1 && c.zone <= 9;
                                    const dist = distanceToZoneEdgeInches(c);

                                    return (
                                        <tr
                                            key={i}
                                            className={clsx(
                                                "border-t border-slate-200 align-top",
                                                overturned ? "bg-violet-50" : "bg-sky-50",
                                            )}
                                        >
                                            <td className="px-3 py-2 font-semibold text-slate-700">
                                                {formatInning(c.inning, c.halfInning)}
                                            </td>
                                            <td className="px-3 py-2 text-slate-700 truncate">
                                                {batter?.boxscoreName ?? "-"}
                                            </td>
                                            <td className="px-3 py-2 text-slate-700">
                                                {formatUmpCall(c.callCode)}
                                            </td>
                                            <td className="px-3 py-2 font-semibold">
                                                <span className={clsx(trueStrike ? "text-green-700" : "text-slate-500")}>
                                                    {zone}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-semibold tabular-nums">
                                                <span className={clsx(
                                                    dist === null ? "text-slate-400"
                                                    : dist >= 0 ? "text-green-700"
                                                    : "text-slate-500"
                                                )}>
                                                    {formatDistance(dist)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-700">
                                                {getPitchCodeFromName(c.pitchType ?? "") ?? c.pitchType ?? "-"}
                                            </td>
                                            <td className="px-3 py-2 text-slate-700">
                                                {typeof c.startSpeed === "number" ? c.startSpeed.toFixed(1) : "-"}
                                            </td>
                                            <td className={clsx("px-3 py-2 font-semibold", overturned ? "text-violet-700" : "text-sky-700")}>
                                                {overturned ? "Overturned" : "Confirmed"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
