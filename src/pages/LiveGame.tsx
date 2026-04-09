import { createContext, useContext } from "react";
import { useParams } from "react-router";
import { NotFoundRedirect } from "./NotFound";
import { useGameData } from "@/hooks/useGameData";
import { getBatterStatsFromGumbo, getCurrentMatchupPitches, getPitchCodeFromName, getPitcherStatsFromGumbo, getPlayerFromGumbo, type GumboFeed, type Linescore, type MatchupPitch, type Play, type TeamData, type TeamLineScore } from "@/types/gumbo";
import { TeamLogo } from "@/components/TeamLogo";
import clsx from "clsx";
import { BaseballDiamond, BaseballOuts } from "@/components/Baseball";
import { PlayerImage } from "@/components/PlayerImg";
import { HorizontalDivider } from "@/components/Util";
import PreviousPlaysList from "@/components/PreviousPlaysList";
import StrikeZone, { getStrikeZoneHeight } from "@/components/StrikeZone";

const GameDataContext = createContext<GumboFeed | null>(null);
const STRIKE_ZONE_WIDTH = 350;

const getPitchSequenceColor = (pitch: MatchupPitch) => {
    if (pitch.isInPlay && pitch.isOut) {
        return "bg-violet-600";
    }

    if (pitch.isInPlay) {
        return "bg-blue-600";
    }

    if (pitch.isStrike) {
        return "bg-red-600";
    }

    if (pitch.isBall) {
        return "bg-green-600";
    }

    return "bg-slate-700";
};

const formatPitchBreak = (value?: number) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "-";
    }

    return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
};

const formatPitchType = (pitchType?: string) => {
    if (!pitchType) {
        return "-";
    }

    return getPitchCodeFromName(pitchType) ?? pitchType;
};

const hasCompletedPlayResult = (play: Play) => {
    return play.about.isComplete && (Boolean(play.result.event) || Boolean(play.result.eventType) || Boolean(play.result.description));
};

function useLiveGameContext() {
    const value = useContext(GameDataContext);

    if (!value) {
        throw new Error("useLiveGameContext must be used within LiveGame");
    }

    return value;
}

function LiveGameSummary() {
    const gameData = useLiveGameContext();
    const currentPlay = gameData.liveData.plays.currentPlay;

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-9 items-center">
                <TeamScoreBox team={gameData.gameData.teams.away} lineScore={gameData.liveData.linescore.teams.away} />
                <GameStatusBox linescore={gameData.liveData.linescore} />
                <TeamScoreBox team={gameData.gameData.teams.home} lineScore={gameData.liveData.linescore.teams.home} isHome />
            </div>

            <div className="w-full flex items-center justify-center mt-10">
                <LinescoreTable linescore={gameData.liveData.linescore} awayTeam={gameData.gameData.teams.away} homeTeam={gameData.gameData.teams.home} />
            </div>

            {currentPlay && <MatchupRow />}
            {currentPlay && <CurrentMatchupStrikeZone />}
        </div>
    );
}

const CurrentMatchupStrikeZone = () => {
    const gameData = useLiveGameContext();
    const currentPlay = gameData.liveData.plays.currentPlay;

    if (!currentPlay) {
        return null;
    }

    const matchup = currentPlay.matchup;

    const batter = getPlayerFromGumbo(gameData, matchup.batter.id);
    if (!batter) {
        return null;
    }

    const pitches = getCurrentMatchupPitches(gameData);
    const strikeZoneHeight = getStrikeZoneHeight({
        strikeZoneTop: batter.strikeZoneTop,
        strikeZoneBottom: batter.strikeZoneBottom,
        width: STRIKE_ZONE_WIDTH,
    });

    return (
        <div className="mt-6 flex flex-wrap justify-center items-start gap-6 xl:flex-nowrap">
            <StrikeZone strikeZoneTop={batter.strikeZoneTop} 
                strikeZoneBottom={batter.strikeZoneBottom} 
                pitches={pitches}
                width={STRIKE_ZONE_WIDTH}
                className="border-2 border-slate-800" />

            <PitchSequenceTable pitches={pitches} height={strikeZoneHeight} currentPlay={currentPlay} batterId={batter.id} />
            <PreviousPlaysList gameData={gameData} height={strikeZoneHeight} />
        </div>
    );
}

const PitchSequenceTable = ({ pitches, height, currentPlay, batterId }: { pitches: MatchupPitch[]; height: number; currentPlay: Play; batterId: number }) => {
    const showCompletedResult = hasCompletedPlayResult(currentPlay);
    const resultBadgeLabel = currentPlay.result.event ?? currentPlay.result.eventType ?? "Play Result";
    const resultDescription = currentPlay.result.description ?? "No description available.";

    return (
        <div className="flex min-w-[320px] max-w-lg flex-col overflow-hidden border border-slate-300 bg-white/80" style={{ height }}>
            <div className="border-b border-slate-300 px-4 py-3">
                <p className="text-sm font-semibold tracking-wide text-slate-700">Pitch Sequence</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full table-fixed text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600">
                        <tr>
                            <th className="w-14 px-4 py-2 font-semibold">#</th>
                            <th className="w-20 px-3 py-2 font-semibold">Velo</th>
                            <th className="w-20 px-3 py-2 font-semibold">Type</th>
                            <th className="w-18 px-3 py-2 font-semibold">Count</th>
                            <th className="w-20 px-3 py-2 font-semibold">H-Break</th>
                            <th className="w-20 px-3 py-2 font-semibold">V-Break</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pitches.map((pitch, index) => (
                            <tr key={`${index}-${pitch.pitchData.startSpeed ?? "pitch"}`} className="border-t border-slate-200 align-top">
                                <td className="px-4 py-2 font-semibold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx("inline-block h-3 w-3 rounded-full", getPitchSequenceColor(pitch))}></span>
                                        <span>{index + 1}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                    {pitch.pitchData.startSpeed != null ? `${Math.round(pitch.pitchData.startSpeed)} mph` : "-"}
                                </td>
                                <td className="px-3 py-2 text-slate-700">{formatPitchType(pitch.pitchType)}</td>
                                <td className="px-3 py-2 text-slate-700">{pitch.count ?? "-"}</td>
                                <td className="px-3 py-2 text-slate-700">{formatPitchBreak(pitch.pitchData.breaks?.breakHorizontal)}</td>
                                <td className="px-3 py-2 text-slate-700">{formatPitchBreak(pitch.pitchData.breaks?.breakVertical)}</td>
                            </tr>
                        ))}
                        {showCompletedResult && (
                            <tr className="border-t border-slate-300 align-top">
                                <td colSpan={6} className="p-3">
                                    <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <PlayerImage playerId={batterId} size={50} />
                                            <div className="min-w-0 flex-1">
                                                <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                                                    {resultBadgeLabel}
                                                </span>
                                                <p className="mt-2 text-sm leading-5 text-slate-700">{resultDescription}</p>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const MatchupRow = () => {
    const gameData = useLiveGameContext();
    const isHomeTeamAtBat = gameData.liveData.linescore.inningHalf === "Bottom";
    const outerClasses = clsx("flex", "w-full", "justify-between", !isHomeTeamAtBat && "flex-row-reverse");

    return (
        <div className={outerClasses}>
            <CurrentPitcherCard />
            <CurrentBatterCard />
        </div>
    );
}

const CurrentPitcherCard = () => {
    const gameData = useLiveGameContext();
    const isHomeTeamAtBat = gameData.liveData.linescore.inningHalf === "Bottom";

    const currentPlay = gameData.liveData.plays.currentPlay;
    if(!currentPlay) { return null; }

    const pitcher = getPlayerFromGumbo(gameData, currentPlay.matchup.pitcher.id);
    if (!pitcher) { return null; }

    const stats = getPitcherStatsFromGumbo(gameData, pitcher.id);

    const headerTextCss = clsx("text-sm", "text-neutral-600", !isHomeTeamAtBat && "text-right");
    const infoBoxCss = clsx("flex", !isHomeTeamAtBat && "flex-row-reverse", !isHomeTeamAtBat && "text-right");

    return (
        <div className="flex flex-col gap-2">
            <p className={headerTextCss}>PITCHING</p>
            <div className={infoBoxCss}>
                <PlayerImage playerId={pitcher.id} size={75} />
                <div className="flex flex-col">
                    <p className="text-lg">
                        <span>{pitcher.firstName}</span>
                        <span className="font-bold"> {pitcher.lastName}</span>
                        <span className="text-stone-500 text-sm"> {pitcher.pitchHand.code}HP</span>
                    </p>
                    <p className="text-md">{stats?.summary}</p>
                    <p className="text-md">{stats?.pitchesThrown} PIT ({stats?.strikes} STR)</p>
                </div>
            </div>
        </div>
    );
}

const CurrentBatterCard = () => {
    const gameData = useLiveGameContext();
    const isHomeTeamAtBat = gameData.liveData.linescore.inningHalf === "Bottom";

    const currentPlay = gameData.liveData.plays.currentPlay;
    if(!currentPlay) { return null; }

    const batter = getPlayerFromGumbo(gameData, currentPlay.matchup.batter.id);
    if (!batter) { return null; }

    const stats = getBatterStatsFromGumbo(gameData, batter.id);

    return (
        <div className="flex flex-col gap-2">
            <p className={clsx("text-sm", "text-neutral-600", isHomeTeamAtBat && "text-right")}>BATTING</p>
            <div className={clsx("flex", isHomeTeamAtBat && "flex-row-reverse", isHomeTeamAtBat && "text-right")}>
                <PlayerImage playerId={batter.id} size={75} />
                <div className="flex flex-col">
                    <p className="text-lg">
                        <span>{batter.firstName}</span>
                        <span className="font-bold"> {batter.lastName}</span>
                        <span className="ms-2 text-stone-500 text-sm">
                             <span className={clsx(batter.batSide.code == "R" && "hidden")}>({batter.batSide.code}) </span>
                            {batter.primaryPosition.abbreviation}
                        </span>
                    </p>
                    <p>{stats?.summary}</p>
                </div>
            </div>
        </div>
    )
}

const LinescoreTable = ({ linescore, awayTeam, homeTeam }: { linescore: Linescore, awayTeam: TeamData, homeTeam: TeamData }) => {
    const currentInning = linescore.currentInning || 0;
    const isTopInning = linescore.inningHalf === "Top";

    return (
        <table className="table-fixed text-lg text-center">
            <thead>
                <tr>
                    <th></th>
                    {linescore.innings.map(inning => (
                        <th className="px-2 text-stone-600" key={inning.num}>{inning.num}</th>
                    ))}
                    <th className="ps-10 pe-2">R</th>
                    <th className="px-2">H</th>
                    <th className="px-2">E</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="font-bold pe-5">{awayTeam.abbreviation}</td>
                    {linescore.innings.map(i => (
                        <InningRunsCell key={i.num} runs={i.away.runs || 0} inningNum={i.num} currentInning={currentInning} isTopHalf={isTopInning} isHome={false} />
                    ))}
                    <td className="ps-10 pe-2 font-bold">{linescore.teams.away.runs}</td>
                    <td className="px-2 font-bold">{linescore.teams.away.hits}</td>
                    <td className="px-2 font-bold">{linescore.teams.away.errors}</td>
                </tr>
                <tr>
                    <td className="font-bold pe-5">{homeTeam.abbreviation}</td>
                    {linescore.innings.map(i => (
                        <InningRunsCell key={i.num} runs={i.home.runs || 0} inningNum={i.num} currentInning={currentInning} isTopHalf={isTopInning} isHome={true} />
                    ))}
                    <td className="ps-10 pe-2 font-bold">{linescore.teams.home.runs}</td>
                    <td className="px-2 font-bold">{linescore.teams.home.hits}</td>
                    <td className="px-2 font-bold">{linescore.teams.home.errors}</td>
                </tr>
            </tbody>
        </table>
    );
}

const InningRunsCell = ({ runs, inningNum, currentInning, isTopHalf, isHome }: { runs: number, inningNum: number, currentInning: number, isTopHalf: boolean, isHome: boolean }) => {
    const isCurrentHalf = isHome ? !isTopHalf : isTopHalf;
    const isCurrent = inningNum == currentInning && isCurrentHalf;

    const noRunsYet = runs === 0 && isCurrent;
    const shouldHide = (isHome && inningNum == currentInning && isTopHalf) || noRunsYet;

    const classes = clsx("px-2", isCurrent && "bg-yellow-300/50", isCurrent && (isHome ? "rounded-tr-lg" : "rounded-tl-lg"), shouldHide && "text-transparent");

    return (
        <td className={classes}>{runs}</td>
    );
}

const GameStatusBox = ({ linescore }: { linescore: Linescore }) => {
    const gameData = useLiveGameContext();
    const balls = gameData.liveData.plays.currentPlay?.count.balls;
    const strikes = gameData.liveData.plays.currentPlay?.count.strikes;
    const count = balls != null && strikes != null ? `${balls}-${strikes}` : null;

    return (
        <div className="flex flex-col justify-center items-center w-full gap-2">
            <p>{linescore.inningState} {linescore.currentInningOrdinal}</p>
            <GameBasesState linescore={linescore} />
            <BaseballOuts outs={linescore.outs ?? 0} />
            {count && (
                <p className="text-xl font-bold text-neutral-600">{count}</p>
            )}
        </div>
    );
}

const GameBasesState = ({ linescore }: { linescore: Linescore }) => {
    const firstOccupied = linescore.offense?.first != null;
    const secondOccupied = linescore.offense?.second != null;
    const thirdOccupied = linescore.offense?.third != null;

    return (
        <BaseballDiamond width={60} firstOccupied={firstOccupied} secondOccupied={secondOccupied} thirdOccupied={thirdOccupied} />
    );
}

const TeamScoreBox = ({ team, lineScore, isHome }: { team: TeamData, lineScore: TeamLineScore, isHome?: boolean }) => {
    const leftHalfClasses = clsx("flex", "items-center", "w-full", isHome && "flex-row-reverse", isHome && "text-right");
    const outerClasses = clsx("flex", "justify-center", "items-center", "col-span-4", "w-full", isHome && "flex-row-reverse", isHome && "text-right", isHome ? "ps-10" : "pe-10");

    return (
        <div className={outerClasses}>
            <div className={leftHalfClasses}>
                <TeamLogo teamId={team.id} width={75} />
                <div className="flex flex-col">
                    <TeamName team={team} />
                    <TeamRecord team={team} />
                </div>
            </div>
            <div>
                <p className="font-bold text-5xl bg-slate-900 text-white px-4 py-1">{lineScore.runs}</p>
            </div>
        </div>
    );
}

const TeamName = ({ team }: { team: TeamData }) => (
    <p className="flex gap-2 text-lg">
        {team.franchiseName}
        <span className="font-bold">{team.teamName}</span>
    </p>
);

const TeamRecord = ({ team }: { team: TeamData }) => {
    const { wins, losses } = team.record;

    return (
        <p className="text-sm text-neutral-600">
            {wins}-{losses}
        </p>
    )
}

export default function LiveGame() {
    const { gameId } = useParams();

    if (!gameId) {
        return NotFoundRedirect();
    }

    const gameData = useGameData({ gameId });

    return (
        <main className="h-full py-10 px-10 border-2 border-neutral-200 bg-gray-500/10 drop-shadow-gray-900 drop-shadow-xl/40 lg:mx-10 font-mono">
            {gameData.isLoading && <p className="text-neutral-600">Loading game data...</p>}
            {gameData.error && <p className="text-red-600">Error loading game data: {gameData.error.message}</p>}
            {gameData.data && (
                <GameDataContext.Provider value={gameData.data}>
                    <LiveGameSummary />
                </GameDataContext.Provider>
            )}
        </main>
    )
}