import { getPlayerFromGumbo, type BoxscoreTeamData, type GumboFeed } from "@/types/gumbo";
import { PlayerImage } from "@/components/PlayerImg";
import { getLiveGamePanelId, getLiveGameTabId, getPlayerPosition, getStartingLineup } from "./shared";

const formatPreviewDisplayStat = (value?: number | string) => {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string" && value.length > 0) {
        return value;
    }

    return "-";
};

const formatPreviewCountStat = (value?: number) => {
    return typeof value === "number" ? value : 0;
};

const getPlayerBatThrows = (gameData: GumboFeed, playerId: number) => {
    const player = getPlayerFromGumbo(gameData, playerId);

    if (!player) {
        return "-";
    }

    return `${player.batSide.code}/${player.pitchHand.code}`;
};

const getPitcherThrows = (gameData: GumboFeed, playerId: number) => {
    const player = getPlayerFromGumbo(gameData, playerId);

    return player?.pitchHand.code ?? "-";
};

const getStartingPitcher = (team: BoxscoreTeamData, gameData: GumboFeed) => {
    const probablePitchers = gameData.gameData.probablePitchers;
    const probableStarterId = probablePitchers
        ? team.team.id === gameData.gameData.teams.away.id
            ? probablePitchers.away.id
            : probablePitchers.home.id
        : undefined;
    const starterId = probableStarterId ?? team.pitchers[0];

    if (!starterId) {
        return null;
    }

    return team.players[`ID${starterId}`] ?? null;
};

const PreviewTeamPanel = ({ team, gameData }: { team: BoxscoreTeamData; gameData: GumboFeed }) => {
    const startingPitcher = getStartingPitcher(team, gameData);
    const lineup = getStartingLineup(team);

    return (
        <section className="overflow-hidden border border-slate-300 bg-white/80">
            <div className="border-b border-slate-300 px-4 py-3">
                <p className="text-sm font-semibold tracking-wide text-slate-700">{team.team.name}</p>
                <p className="text-xs font-semibold tracking-wide text-slate-500">PROJECTED STARTERS</p>
            </div>
            <div className="flex flex-col gap-4 p-4">
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold tracking-wide text-slate-500">STARTING PITCHER</p>
                    {startingPitcher ? (
                        <div className="mt-3 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <PlayerImage playerId={startingPitcher.person.id} size={72} />
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">{startingPitcher.person.fullName}</p>
                                    <p className="text-sm text-slate-600">Throws {getPitcherThrows(gameData, startingPitcher.person.id)}</p>
                                </div>
                            </div>
                            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
                                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                                    <dt className="text-xs font-semibold tracking-wide text-slate-500">W-L</dt>
                                    <dd className="mt-1 text-slate-800">{formatPreviewCountStat(startingPitcher.seasonStats.pitching.wins)}-{formatPreviewCountStat(startingPitcher.seasonStats.pitching.losses)}</dd>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                                    <dt className="text-xs font-semibold tracking-wide text-slate-500">ERA</dt>
                                    <dd className="mt-1 text-slate-800">{formatPreviewDisplayStat(startingPitcher.seasonStats.pitching.era)}</dd>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                                    <dt className="text-xs font-semibold tracking-wide text-slate-500">IP</dt>
                                    <dd className="mt-1 text-slate-800">{formatPreviewDisplayStat(startingPitcher.seasonStats.pitching.inningsPitched)}</dd>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                                    <dt className="text-xs font-semibold tracking-wide text-slate-500">WHIP</dt>
                                    <dd className="mt-1 text-slate-800">{formatPreviewDisplayStat(startingPitcher.seasonStats.pitching.whip)}</dd>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                                    <dt className="text-xs font-semibold tracking-wide text-slate-500">K</dt>
                                    <dd className="mt-1 text-slate-800">{formatPreviewCountStat(startingPitcher.seasonStats.pitching.strikeOuts)}</dd>
                                </div>
                                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                                    <dt className="text-xs font-semibold tracking-wide text-slate-500">BB/9</dt>
                                    <dd className="mt-1 text-slate-800">{formatPreviewDisplayStat(startingPitcher.seasonStats.pitching.walksPer9Inn)}</dd>
                                </div>
                            </dl>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-slate-500">Starting pitcher has not been announced yet.</p>
                    )}
                </div>

                <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                    <table className="w-full min-w-3xl table-fixed text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="w-12 px-3 py-2 font-semibold text-center">#</th>
                                <th className="w-[28%] px-3 py-2 font-semibold">Batter</th>
                                <th className="w-16 px-3 py-2 font-semibold text-center">Pos</th>
                                <th className="w-16 px-3 py-2 font-semibold text-center">B/T</th>
                                <th className="w-20 px-3 py-2 font-semibold text-center">AVG</th>
                                <th className="w-20 px-3 py-2 font-semibold text-center">OBP</th>
                                <th className="w-20 px-3 py-2 font-semibold text-center">SLG</th>
                                <th className="w-20 px-3 py-2 font-semibold text-center">OPS</th>
                                <th className="w-16 px-3 py-2 font-semibold text-center">HR</th>
                                <th className="w-16 px-3 py-2 font-semibold text-center">RBI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineup.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-3 py-4 text-center text-slate-500">Starting lineup has not been posted yet.</td>
                                </tr>
                            ) : lineup.map(({ slot, player }) => (
                                <tr key={`${slot}-${player.person.id}`} className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50">
                                    <td className="px-3 py-2 text-center font-semibold text-slate-700">{slot}</td>
                                    <td className="px-3 py-2 text-slate-700">
                                        <div className="font-medium">{player.person.fullName}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-700">{getPlayerPosition(player)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{getPlayerBatThrows(gameData, player.person.id)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{formatPreviewDisplayStat(player.seasonStats.batting.avg)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{formatPreviewDisplayStat(player.seasonStats.batting.obp)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{formatPreviewDisplayStat(player.seasonStats.batting.slg)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{formatPreviewDisplayStat(player.seasonStats.batting.ops)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{formatPreviewCountStat(player.seasonStats.batting.homeRuns)}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{formatPreviewCountStat(player.seasonStats.batting.rbi)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default function PreviewTabPanel({ gameData }: { gameData: GumboFeed }) {
    const awayBoxScore = gameData.liveData.boxscore.teams.away;
    const homeBoxScore = gameData.liveData.boxscore.teams.home;

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("preview")}
            aria-labelledby={getLiveGameTabId("preview")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                <PreviewTeamPanel team={awayBoxScore} gameData={gameData} />
                <PreviewTeamPanel team={homeBoxScore} gameData={gameData} />
            </div>
        </div>
    );
}