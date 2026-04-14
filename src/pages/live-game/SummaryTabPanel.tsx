import { getPitcherSeasonStatsFromGumbo, type GumboFeed, type Play } from "@/types/gumbo";
import { PlayerImage } from "@/components/PlayerImg";
import clsx from "clsx";
import { getLiveGamePanelId, getLiveGameTabId } from "./shared";

const getScoringPlays = (gameData: GumboFeed) => {
    const playsByAtBatIndex = new Map(gameData.liveData.plays.allPlays.map((play) => [play.atBatIndex, play]));

    return gameData.liveData.plays.scoringPlays
        .map((atBatIndex) => playsByAtBatIndex.get(atBatIndex))
        .filter((play): play is Play => Boolean(play));
};

const formatGameDuration = (minutes?: number) => {
    if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
        return "-";
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return hours > 0 ? `${hours}:${remainingMinutes.toString().padStart(2, "0")}` : `${remainingMinutes} min`;
};

const formatGameDateTime = (value?: string) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
};

const formatAttendance = (attendance?: number) => {
    if (typeof attendance !== "number" || !Number.isFinite(attendance)) {
        return "-";
    }

    return attendance.toLocaleString();
};

const getScoringTeam = (play: Play, gameData: GumboFeed) => {
    return play.about.halfInning === "top" ? gameData.gameData.teams.away : gameData.gameData.teams.home;
};

const getPitcherRecordSummary = (gameData: GumboFeed, playerId: number, label: "winner" | "loser" | "save") => {
    const seasonStats = getPitcherSeasonStatsFromGumbo(gameData, playerId);

    if (!seasonStats) {
        return "-";
    }

    if (label === "save") {
        return `${seasonStats.saves ?? 0} SV`;
    }

    const wins = seasonStats.wins ?? 0;
    const losses = seasonStats.losses ?? 0;
    const era = seasonStats.era ?? "-";

    return `${wins}-${losses}, ${era} ERA`;
};

const getPitcherOfRecordCardBgColor = (label: string) => {
    switch (label) {
        case "WINNER":
            return "bg-green-100";
        case "LOSER":
            return "bg-red-100";
        case "SAVE":
            return "bg-blue-100";
        default:
            return "bg-white/70";
    }
};

const PitcherOfRecordCard = ({
    label,
    player,
    gameData,
}: {
    label: string;
    player?: { id: number; fullName: string };
    gameData: GumboFeed;
}) => {
    if (!player) {
        return (
            <div className="rounded border border-slate-200 bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-sm text-slate-500">-</p>
            </div>
        );
    }

    const recordLabel = label === "WINNER" ? "winner" : label === "LOSER" ? "loser" : "save";
    const bgCss = clsx("rounded border border-slate-200 px-4 py-3 flex gap-2", getPitcherOfRecordCardBgColor(label));

    return (
        <div className={bgCss}>
            <PlayerImage playerId={player.id} />
            <div className="flex flex-col">
                <p className="text-xs font-semibold tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 font-semibold text-slate-800">{player.fullName}</p>
                <p className="text-sm text-slate-600">{getPitcherRecordSummary(gameData, player.id, recordLabel)}</p>
            </div>
        </div>
    );
};

export default function SummaryTabPanel({ gameData }: { gameData: GumboFeed }) {
    const decisions = gameData.liveData.decisions;
    const scoringPlays = getScoringPlays(gameData);
    const gameInfoRows = [
        { label: "Time of Game", value: formatGameDuration(gameData.gameData.gameInfo?.gameDurationMinutes) },
        { label: "Attendance", value: formatAttendance(gameData.gameData.gameInfo?.attendance) },
        { label: "First Pitch", value: formatGameDateTime(gameData.gameData.gameInfo?.firstPitch) },
        { label: "Venue", value: gameData.gameData.venue.name },
        { label: "Weather", value: gameData.gameData.weather ? `${gameData.gameData.weather.temp} degrees, ${gameData.gameData.weather.condition}` : "-" },
        { label: "Wind", value: gameData.gameData.weather ? gameData.gameData.weather.wind : "-" },
        { label: "Official Scorer", value: gameData.gameData.officialScorer?.fullName ?? "-" },
        { label: "Datacaster", value: gameData.gameData.primaryDatacaster?.fullName ?? "-" },
    ];

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("summary")}
            aria-labelledby={getLiveGameTabId("summary")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="flex justify-between flex-wrap gap-6">
                <section className="overflow-hidden border border-slate-300 bg-white/80 w-full max-w-2xs">
                    <div className="border-b border-slate-300 px-4 py-3">
                        <p className="text-sm font-semibold tracking-wide text-slate-700">Pitchers Of Record</p>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                        <PitcherOfRecordCard label="WINNER" player={decisions?.winner} gameData={gameData} />
                        <PitcherOfRecordCard label="LOSER" player={decisions?.loser} gameData={gameData} />
                        <PitcherOfRecordCard label="SAVE" player={decisions?.save} gameData={gameData} />
                    </div>
                </section>

                <section className="w-full max-w-3xl overflow-hidden border border-slate-300 bg-white/80">
                    <div className="border-b border-slate-300 px-4 py-3">
                        <p className="text-sm font-semibold tracking-wide text-slate-700">Scoring Plays</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="w-24 px-3 py-2 font-semibold">Inning</th>
                                    <th className="w-20 px-3 py-2 font-semibold">Team</th>
                                    <th className="px-3 py-2 font-semibold">Play</th>
                                    <th className="w-24 px-3 py-2 font-semibold text-center">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scoringPlays.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-4 text-center text-slate-500">No scoring plays recorded.</td>
                                    </tr>
                                ) : scoringPlays.map((play) => {
                                    const team = getScoringTeam(play, gameData);

                                    return (
                                        <tr key={play.atBatIndex} className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50">
                                            <td className="px-3 py-2 text-slate-700">{play.about.halfInning === "top" ? "Top" : "Bot"} {play.about.inning}</td>
                                            <td className="px-3 py-2 font-semibold text-slate-700">{team.abbreviation}</td>
                                            <td className="px-3 py-2 text-slate-700 whitespace-normal wrap-break-word">{play.result.description ?? play.result.event ?? "Scoring play"}</td>
                                            <td className="px-3 py-2 text-center text-slate-700">{play.result.awayScore}-{play.result.homeScore}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="w-full max-w-xl overflow-hidden border border-slate-300 bg-white/80">
                    <div className="border-b border-slate-300 px-4 py-3">
                        <p className="text-sm font-semibold tracking-wide text-slate-700">Game Info</p>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                        {gameInfoRows.map((row) => (
                            <div key={row.label} className="rounded border border-slate-200 bg-white/70 px-4 py-3">
                                <dt className="text-xs font-semibold tracking-wide text-slate-500">{row.label}</dt>
                                <dd className="mt-2 text-sm text-slate-800">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            </div>
        </div>
    );
}