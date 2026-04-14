import { getCurrentMatchupPitches, getHitDataFromPlay, getPlayerFromGumbo, type BoxscoreTeamData, type GumboFeed, type MatchupPitch, type Play } from "@/types/gumbo";
import PreviousPlaysList from "@/components/PreviousPlaysList";
import PlaySummaryCard from "@/components/PlaySummaryCard";
import PitchSequenceTable from "@/components/PitchSequenceTable";
import StrikeZone from "@/components/StrikeZone";
import clsx from "clsx";
import { getScorecardCodeFromPlay } from "@/util/scorecard";
import { getCurrentLineup, getCurrentOffenseBoxscore, getLiveGamePanelId, getLiveGameTabId, getPlayerPosition } from "./shared";

const hasCompletedPlayResult = (play: Play) => {
    return play.about.isComplete && (Boolean(play.result.event) || Boolean(play.result.eventType) || Boolean(play.result.description));
};

const getBatterShortName = (id: number, gameData: GumboFeed) => {
    const player = getPlayerFromGumbo(gameData, id);

    if (!player) {
        return "";
    }

    return player.boxscoreName;
};

const CurrentLineupPanel = ({ team, currentBatterId, height, gameData }: { team: BoxscoreTeamData; currentBatterId: number; height: number; gameData: GumboFeed }) => {
    const lineup = getCurrentLineup(team);

    return (
        <div className="flex w-full max-w-xs flex-col overflow-hidden border border-slate-300 bg-white/80 xl:w-56 xl:flex-none" style={{ height }}>
            <div className="border-b border-slate-300 px-4 py-3">
                <p className="text-sm font-semibold tracking-wide text-slate-700">{team.team.name}</p>
                <p className="text-xs font-semibold tracking-wide text-slate-500">LINEUP</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full table-fixed text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                        <tr>
                            <th className="w-10 px-3 py-2 font-semibold text-center">#</th>
                            <th className="px-3 py-2 font-semibold">Batter</th>
                            <th className="w-12 px-3 py-2 font-semibold text-center">Pos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineup.map(({ slot, player }) => {
                            const isCurrentBatter = player.person.id === currentBatterId;

                            return (
                                <tr
                                    key={`${slot}-${player.person.id}`}
                                    className={clsx(
                                        "border-t border-slate-200 align-top",
                                        isCurrentBatter ? "bg-amber-100/80" : "odd:bg-white even:bg-slate-50",
                                    )}
                                >
                                    <td className="px-3 py-2 text-center font-semibold text-slate-700">{slot}</td>
                                    <td className="px-3 py-2 text-slate-700">
                                        <div className="truncate font-medium">{getBatterShortName(player.person.id, gameData)}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{getPlayerPosition(player)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PitchSequencePanel = ({ pitches, height, currentPlay, batterId, strikeZoneTop, strikeZoneBottom }: { pitches: MatchupPitch[]; height: number; currentPlay: Play; batterId: number; strikeZoneTop: number; strikeZoneBottom: number }) => {
    const showCompletedResult = hasCompletedPlayResult(currentPlay);
    const resultBadgeLabel = currentPlay.result.event ?? currentPlay.result.eventType ?? "Play Result";
    const scorecardCode = getScorecardCodeFromPlay(currentPlay);
    const resultDescription = currentPlay.result.description ?? "No description available.";
    const hitData = getHitDataFromPlay(currentPlay);

    return (
        <div className="flex w-full min-w-0 max-w-2xl flex-col overflow-hidden border border-slate-300 bg-white/80 xl:min-w-136 xl:flex-[1.1]" style={{ height }}>
            <div className="border-b border-slate-300 px-4 py-3">
                <p className="text-sm font-semibold tracking-wide text-slate-700">Pitch Sequence</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
                <PitchSequenceTable
                    pitches={pitches}
                    stickyHeader
                    resultRow={showCompletedResult ? (
                        <tr className="border-t border-slate-300 align-top">
                            <td colSpan={7} className="p-3">
                                <PlaySummaryCard
                                    badgeLabel={resultBadgeLabel}
                                    scorecardCode={scorecardCode}
                                    description={resultDescription}
                                    playerId={batterId}
                                    hitData={hitData}
                                    strikeZoneTop={strikeZoneTop}
                                    strikeZoneBottom={strikeZoneBottom}
                                    className="border-slate-300 bg-slate-50"
                                    badgeClassName="bg-slate-900"
                                />
                            </td>
                        </tr>
                    ) : undefined}
                />
            </div>
        </div>
    );
};

export default function AtBatTabPanel({
    strikeZoneHeight,
    strikeZoneWidth,
    currentPlay,
    batterId,
    strikeZoneTop,
    strikeZoneBottom,
    gameData,
}: {
    strikeZoneHeight: number;
    strikeZoneWidth: number;
    currentPlay: Play;
    batterId: number;
    strikeZoneTop: number;
    strikeZoneBottom: number;
    gameData: GumboFeed;
}) {
    const offenseTeam = getCurrentOffenseBoxscore(gameData);
    const pitches = getCurrentMatchupPitches(gameData);

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("at-bat")}
            aria-labelledby={getLiveGameTabId("at-bat")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="flex w-full flex-col items-stretch gap-6 xl:flex-row xl:flex-wrap xl:items-start xl:justify-center 2xl:flex-nowrap 2xl:justify-center">
                <StrikeZone
                    strikeZoneTop={strikeZoneTop}
                    strikeZoneBottom={strikeZoneBottom}
                    pitches={pitches}
                    width={strikeZoneWidth}
                    className="border-2 border-slate-800"
                />

                <PitchSequencePanel
                    pitches={pitches}
                    height={strikeZoneHeight}
                    currentPlay={currentPlay}
                    batterId={batterId}
                    strikeZoneTop={strikeZoneTop}
                    strikeZoneBottom={strikeZoneBottom}
                />
                <PreviousPlaysList gameData={gameData} height={strikeZoneHeight} />
                {offenseTeam && <CurrentLineupPanel team={offenseTeam} currentBatterId={currentPlay.matchup.batter.id} height={strikeZoneHeight} gameData={gameData} />}
            </div>
        </div>
    );
}