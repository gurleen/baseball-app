import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import { NotFoundRedirect } from "./NotFound";
import { useGameData } from "@/hooks/useGameData";
import { getBatterStatsFromGumbo, getCurrentMatchupPitches, getHitDataFromPlay, getPitcherStatsFromGumbo, getPlayerFromGumbo, type GumboFeed, type MatchupPitch, type Linescore, type Play, type TeamData, type TeamLineScore } from "@/types/gumbo";
import { TeamLogo } from "@/components/TeamLogo";
import clsx from "clsx";
import { BaseballDiamond, BaseballOuts } from "@/components/Baseball";
import { PlayerImage } from "@/components/PlayerImg";
import PitchSequenceTable from "@/components/PitchSequenceTable";
import PlaySummaryCard from "@/components/PlaySummaryCard";
import PreviousPlaysList from "@/components/PreviousPlaysList";
import StrikeZone, { getStrikeZoneHeight } from "@/components/StrikeZone";

const GameDataContext = createContext<GumboFeed | null>(null);
const DESKTOP_STRIKE_ZONE_WIDTH = 350;
const MOBILE_STRIKE_ZONE_WIDTH = 280;

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
        <div className="flex flex-col items-center gap-8">
            <div className="flex w-full flex-col items-center gap-6 2xl:flex-row 2xl:items-center 2xl:justify-center 2xl:gap-10">
                <div className="flex w-full flex-col items-center gap-6 2xl:w-auto 2xl:min-w-0 2xl:flex-row 2xl:items-center 2xl:justify-center">
                    <div className="flex w-full max-w-4xl flex-col gap-3">
                        <TeamScoreBox team={gameData.gameData.teams.away} lineScore={gameData.liveData.linescore.teams.away} />
                        <TeamScoreBox team={gameData.gameData.teams.home} lineScore={gameData.liveData.linescore.teams.home} />
                    </div>

                    <div className="flex justify-center">
                        <GameStatusBox linescore={gameData.liveData.linescore} />
                    </div>
                </div>

                <div className="flex w-full justify-center overflow-x-auto 2xl:w-auto 2xl:flex-none">
                    <LinescoreTable linescore={gameData.liveData.linescore} awayTeam={gameData.gameData.teams.away} homeTeam={gameData.gameData.teams.home} />
                </div>
            </div>

            {currentPlay && <MatchupRow />}
            {currentPlay && <CurrentMatchupStrikeZone />}
        </div>
    );
}

const CurrentMatchupStrikeZone = () => {
    const gameData = useLiveGameContext();
    const currentPlay = gameData.liveData.plays.currentPlay;
    const [strikeZoneWidth, setStrikeZoneWidth] = useState(() => {
        if (typeof window === "undefined") {
            return DESKTOP_STRIKE_ZONE_WIDTH;
        }

        return window.innerWidth < 640 ? MOBILE_STRIKE_ZONE_WIDTH : DESKTOP_STRIKE_ZONE_WIDTH;
    });

    useEffect(() => {
        const updateStrikeZoneWidth = () => {
            setStrikeZoneWidth(window.innerWidth < 640 ? MOBILE_STRIKE_ZONE_WIDTH : DESKTOP_STRIKE_ZONE_WIDTH);
        };

        updateStrikeZoneWidth();
        window.addEventListener("resize", updateStrikeZoneWidth);

        return () => window.removeEventListener("resize", updateStrikeZoneWidth);
    }, []);

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
        width: strikeZoneWidth,
    });

    return (
        <div className="mt-6 flex w-full flex-col items-center gap-6 xl:flex-row xl:flex-wrap xl:items-start xl:justify-center 2xl:flex-nowrap 2xl:justify-center">
            <StrikeZone strikeZoneTop={batter.strikeZoneTop}
                strikeZoneBottom={batter.strikeZoneBottom}
                pitches={pitches}
                width={strikeZoneWidth}
                className="border-2 border-slate-800" />

            <PitchSequencePanel
                pitches={pitches}
                height={strikeZoneHeight}
                currentPlay={currentPlay}
                batterId={batter.id}
                strikeZoneTop={batter.strikeZoneTop}
                strikeZoneBottom={batter.strikeZoneBottom}
            />
            <PreviousPlaysList gameData={gameData} height={strikeZoneHeight} />
        </div>
    );
}

const PitchSequencePanel = ({ pitches, height, currentPlay, batterId, strikeZoneTop, strikeZoneBottom }: { pitches: MatchupPitch[]; height: number; currentPlay: Play; batterId: number; strikeZoneTop: number; strikeZoneBottom: number }) => {
    const showCompletedResult = hasCompletedPlayResult(currentPlay);
    const resultBadgeLabel = currentPlay.result.event ?? currentPlay.result.eventType ?? "Play Result";
    const resultDescription = currentPlay.result.description ?? "No description available.";
    const hitData = getHitDataFromPlay(currentPlay);

    return (
        <div className="flex w-full max-w-lg flex-col overflow-hidden border border-slate-300 bg-white/80" style={{ height }}>
            <div className="border-b border-slate-300 px-4 py-3">
                <p className="text-sm font-semibold tracking-wide text-slate-700">Pitch Sequence</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <PitchSequenceTable
                    pitches={pitches}
                    stickyHeader
                    resultRow={showCompletedResult ? (
                        <tr className="border-t border-slate-300 align-top">
                            <td colSpan={6} className="p-3">
                                <PlaySummaryCard
                                    badgeLabel={resultBadgeLabel}
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
}

const MatchupRow = () => {
    const outerClasses = clsx("flex", "w-full", "flex-col", "items-center", "gap-6", "lg:flex-row", "lg:flex-wrap", "lg:justify-center", "lg:gap-16");

    return (
        <div className={outerClasses}>
            <CurrentPitcherCard />
            <CurrentBatterCard />
        </div>
    );
}

const CurrentPitcherCard = () => {
    const gameData = useLiveGameContext();

    const currentPlay = gameData.liveData.plays.currentPlay;
    if (!currentPlay) { return null; }

    const pitcher = getPlayerFromGumbo(gameData, currentPlay.matchup.pitcher.id);
    if (!pitcher) { return null; }

    const stats = getPitcherStatsFromGumbo(gameData, pitcher.id);

    const headerTextCss = clsx("text-sm", "text-neutral-600");
    const infoBoxCss = clsx("flex");

    return (
        <div className="flex w-full max-w-md flex-col items-center gap-2 text-center lg:items-start lg:text-left">
            <p className={headerTextCss}>PITCHING</p>
            <div className={clsx(infoBoxCss, "items-center gap-3") }>
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

    const currentPlay = gameData.liveData.plays.currentPlay;
    if (!currentPlay) { return null; }

    const batter = getPlayerFromGumbo(gameData, currentPlay.matchup.batter.id);
    if (!batter) { return null; }

    const stats = getBatterStatsFromGumbo(gameData, batter.id);

    return (
        <div className="flex w-full max-w-md flex-col items-center gap-2 text-center lg:items-start lg:text-left">
            <p className={clsx("text-sm", "text-neutral-600")}>BATTING</p>
            <div className={clsx("flex", "items-center", "gap-3")}>
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
        <table className="table-fixed text-lg text-center min-w-max">
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
        <div className="flex w-full max-w-sm flex-col items-center justify-center gap-2 text-center">
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
    const leftHalfClasses = clsx("flex", "items-center", "justify-center", "gap-3", "w-full", isHome && "flex-row-reverse", isHome && "text-right", "sm:justify-start");
    const outerClasses = clsx("flex", "w-full", "max-w-4xl", "flex-col", "items-center", "gap-3", "rounded-lg", "border", "border-slate-200", "bg-white/60", "px-4", "py-3", "sm:flex-row", "sm:justify-between", isHome && "sm:flex-row-reverse", isHome && "sm:text-right");

    return (
        <div className={outerClasses}>
            <div className={leftHalfClasses}>
                <TeamLogo teamId={team.id} width={75} />
                <div className="flex min-w-0 flex-col">
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
    <p className="flex flex-wrap gap-x-2 gap-y-1 text-lg leading-tight">
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
        return (
            <div className="flex min-h-full items-center justify-center">
                <p className="text-red-600">No game ID provided.</p>
            </div>
        );
    }

    const gameData = useGameData({ gameId });

    return (
        <main className="min-h-full px-3 py-6 md:px-8 md:py-5 border-2 border-neutral-200 bg-gray-500/10 drop-shadow-gray-900 drop-shadow-xl/40 lg:mx-10 font-mono">
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