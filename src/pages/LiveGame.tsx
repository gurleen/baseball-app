import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import { useGameData } from "@/hooks/useGameData";
import { getBatterStatsFromGumbo, getCurrentMatchupPitches, getHitDataFromPlay, getPitcherStatsFromGumbo, getPlayerFromGumbo, type GumboFeed, type MatchupPitch, type Linescore, type Play, type TeamData, type TeamLineScore, getPitcherSeasonStatsFromGumbo, getBatterSeasonStatsFromGumbo, BattingStats, type BoxscorePlayer, type BoxscoreTeamData } from "@/types/gumbo";
import { TeamLogo } from "@/components/TeamLogo";
import clsx from "clsx";
import { BaseballDiamond, BaseballOuts } from "@/components/Baseball";
import OffenseTable from "../components/OffenseTable";
import PitchingTable from "../components/PitchingTable";
import { PlayerImage } from "@/components/PlayerImg";
import PitchSequenceTable from "@/components/PitchSequenceTable";
import PlaySummaryCard from "@/components/PlaySummaryCard";
import PreviousPlaysList from "@/components/PreviousPlaysList";
import StrikeZone, { getStrikeZoneHeight } from "@/components/StrikeZone";
import { getScorecardCodeFromPlay } from "@/util/scorecard";

const GameDataContext = createContext<GumboFeed | null>(null);
const DESKTOP_STRIKE_ZONE_WIDTH = 350;
const MOBILE_STRIKE_ZONE_WIDTH = 280;
type LiveGameTab = "at-bat" | "offense" | "pitching";

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
            <div className="flex w-full flex-col items-center gap-6 2xl:flex-row 2xl:items-start 2xl:justify-center 2xl:gap-10">
                <div className="flex w-full flex-col items-center gap-6 2xl:w-136 2xl:flex-none 2xl:items-center 2xl:justify-center">
                    <div className="flex w-full max-w-2xl flex-col gap-3 2xl:max-w-136">
                        <TeamScoreBox team={gameData.gameData.teams.away} lineScore={gameData.liveData.linescore.teams.away} />
                        <TeamScoreBox team={gameData.gameData.teams.home} lineScore={gameData.liveData.linescore.teams.home} />
                    </div>
                </div>

                <div className="flex flex-col h-full justify-between gap-12">
                    <LinescoreTable linescore={gameData.liveData.linescore} awayTeam={gameData.gameData.teams.away} homeTeam={gameData.gameData.teams.home} />
                    <GameStatusBox linescore={gameData.liveData.linescore} />
                </div>

                {currentPlay && <MatchupRow />}
            </div>

            {currentPlay && <CurrentMatchupStrikeZone />}
        </div>
    );
}

const CurrentMatchupStrikeZone = () => {
    const gameData = useLiveGameContext();
    const currentPlay = gameData.liveData.plays.currentPlay;
    const [activeTab, setActiveTab] = useState<LiveGameTab>("at-bat");
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
        <section className="mt-6 flex w-full self-stretch flex-col">
            <div role="tablist" aria-label="Live game detail tabs" className="flex items-end gap-2 border-b border-slate-300">
                <LiveGameTabButton
                    tab="at-bat"
                    label="AT BAT"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
                <LiveGameTabButton
                    tab="offense"
                    label="OFFENSE"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
                <LiveGameTabButton
                    tab="pitching"
                    label="PITCHING"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
            </div>
            {activeTab === "at-bat" && (
                <AtBatTabPanel
                    pitches={pitches}
                    strikeZoneHeight={strikeZoneHeight}
                    strikeZoneWidth={strikeZoneWidth}
                    currentPlay={currentPlay}
                    batterId={batter.id}
                    strikeZoneTop={batter.strikeZoneTop}
                    strikeZoneBottom={batter.strikeZoneBottom}
                    gameData={gameData}
                />
            )}
            {activeTab === "offense" && <OffenseTabPanel gameData={gameData} />}
            {activeTab === "pitching" && <PitchingTabPanel gameData={gameData} />}
        </section>
    );
}

const getLiveGameTabId = (tab: LiveGameTab) => `live-game-${tab}-tab`;

const getLiveGamePanelId = (tab: LiveGameTab) => `live-game-${tab}-panel`;

const getPlayerPosition = (player: BoxscorePlayer) => {
    return player.position?.abbreviation ?? player.allPositions?.at(-1)?.abbreviation ?? "-";
};

const getLineupSlot = (player: BoxscorePlayer) => {
    if (!player.battingOrder) {
        return null;
    }

    const battingOrder = Number.parseInt(player.battingOrder, 10);
    if (Number.isNaN(battingOrder)) {
        return null;
    }

    return Math.floor(battingOrder / 100);
};

const getCurrentOffenseBoxscore = (gameData: GumboFeed) => {
    const offenseTeamId = gameData.liveData.linescore.offense?.team.id;

    if (offenseTeamId === gameData.liveData.boxscore.teams.away.team.id) {
        return gameData.liveData.boxscore.teams.away;
    }

    if (offenseTeamId === gameData.liveData.boxscore.teams.home.team.id) {
        return gameData.liveData.boxscore.teams.home;
    }

    return null;
};

const getCurrentLineup = (team: BoxscoreTeamData) => {
    const players = Object.values(team.players);
    const activeLineupBySlot = new Map<number, BoxscorePlayer>();

    for (const player of players) {
        const lineupSlot = getLineupSlot(player);

        if (!lineupSlot) {
            continue;
        }

        const currentPlayer = activeLineupBySlot.get(lineupSlot);

        if (!currentPlayer) {
            activeLineupBySlot.set(lineupSlot, player);
            continue;
        }

        const currentOrder = Number.parseInt(currentPlayer.battingOrder ?? "0", 10);
        const nextOrder = Number.parseInt(player.battingOrder ?? "0", 10);

        if (nextOrder >= currentOrder) {
            activeLineupBySlot.set(lineupSlot, player);
        }
    }

    return Array.from(activeLineupBySlot.entries())
        .sort(([leftSlot], [rightSlot]) => leftSlot - rightSlot)
        .map(([slot, player]) => ({
            slot,
            player,
        }));
};

const LiveGameTabButton = ({
    tab,
    label,
    activeTab,
    onSelect,
}: {
    tab: LiveGameTab;
    label: string;
    activeTab: LiveGameTab;
    onSelect: (tab: LiveGameTab) => void;
}) => {
    const isActive = activeTab === tab;

    return (
        <button
            type="button"
            role="tab"
            id={getLiveGameTabId(tab)}
            aria-selected={isActive}
            aria-controls={getLiveGamePanelId(tab)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(tab)}
            className={clsx(
                "rounded-t-md border border-b-0 px-4 py-2 text-sm font-semibold tracking-wide hover:cursor-pointer",
                isActive ? "border-slate-700 bg-slate-900 text-white" : "border-slate-300 bg-white/70 text-slate-600"
            )}
        >
            {label}
        </button>
    );
};

const AtBatTabPanel = ({
    pitches,
    strikeZoneHeight,
    strikeZoneWidth,
    currentPlay,
    batterId,
    strikeZoneTop,
    strikeZoneBottom,
    gameData,
}: {
    pitches: MatchupPitch[];
    strikeZoneHeight: number;
    strikeZoneWidth: number;
    currentPlay: Play;
    batterId: number;
    strikeZoneTop: number;
    strikeZoneBottom: number;
    gameData: GumboFeed;
}) => {
    const offenseTeam = getCurrentOffenseBoxscore(gameData);

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("at-bat")}
            aria-labelledby={getLiveGameTabId("at-bat")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="flex w-full flex-col items-stretch gap-6 xl:flex-row xl:flex-wrap xl:items-start xl:justify-center 2xl:flex-nowrap 2xl:justify-center">
                <StrikeZone strikeZoneTop={strikeZoneTop}
                    strikeZoneBottom={strikeZoneBottom}
                    pitches={pitches}
                    width={strikeZoneWidth}
                    className="border-2 border-slate-800" />

                <PitchSequencePanel
                    pitches={pitches}
                    height={strikeZoneHeight}
                    currentPlay={currentPlay}
                    batterId={batterId}
                    strikeZoneTop={strikeZoneTop}
                    strikeZoneBottom={strikeZoneBottom}
                />
                <PreviousPlaysList gameData={gameData} height={strikeZoneHeight} />
                {offenseTeam && <CurrentLineupPanel team={offenseTeam} currentBatterId={currentPlay.matchup.batter.id} height={strikeZoneHeight} />}
            </div>
        </div>
    );
};

const OffenseTabPanel = ({ gameData }: { gameData: GumboFeed }) => {
    const awayBoxScore = gameData.liveData.boxscore.teams.away;
    const homeBoxScore = gameData.liveData.boxscore.teams.home;

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("offense")}
            aria-labelledby={getLiveGameTabId("offense")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <OffenseTable team={awayBoxScore} />
                <OffenseTable team={homeBoxScore} />
            </div>
        </div>
    );
};

const PitchingTabPanel = ({ gameData }: { gameData: GumboFeed }) => {
    const awayBoxScore = gameData.liveData.boxscore.teams.away;
    const homeBoxScore = gameData.liveData.boxscore.teams.home;

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("pitching")}
            aria-labelledby={getLiveGameTabId("pitching")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PitchingTable team={awayBoxScore} gameData={gameData} />
                <PitchingTable team={homeBoxScore} gameData={gameData} />
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
}

const getBatterShortName = (id: number, gameData: GumboFeed) => {
    const player = getPlayerFromGumbo(gameData, id);
    
    if (!player) {
        return "";
    }

    return player.boxscoreName;
}

const CurrentLineupPanel = ({ team, currentBatterId, height }: { team: BoxscoreTeamData; currentBatterId: number; height: number }) => {
    const gameData = useLiveGameContext();
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

const MatchupRow = () => {
    const outerClasses = clsx("flex", "w-full", "max-w-md", "flex-col", "items-stretch", "gap-6", "2xl:w-[22rem]", "2xl:flex-none");

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
    const seasonStats = getPitcherSeasonStatsFromGumbo(gameData, pitcher.id);

    const numPitches = stats?.pitchesThrown ?? 0;
    const numStrikes = stats?.strikes ?? 0;
    const era = seasonStats ? seasonStats.era : "-";
    const ip = seasonStats ? seasonStats.inningsPitched : "-";
    const { wins, losses } = seasonStats ?? {};
    const winLoss = (wins != null && losses != null && (wins + losses > 0)) ? `${wins}-${losses}, ` : "";

    const summary = `${winLoss}${era} ERA, ${ip} IP`;

    const headerTextCss = clsx("text-sm", "text-neutral-600");
    const infoBoxCss = clsx("flex");

    return (
        <fieldset className="flex w-full max-w-md flex-col items-center gap-2 rounded border border-slate-700 px-4 pb-3 text-center lg:items-start lg:text-left">
            <legend className={clsx(headerTextCss, "px-1")}>PITCHING</legend>
            <div className={clsx(infoBoxCss, "items-center gap-3")}>
                <PlayerImage playerId={pitcher.id} size={75} />
                <div className="flex flex-col">
                    <p className="text-lg">
                        <span>{pitcher.useName}</span>
                        <span className="font-bold"> {pitcher.lastName}</span>
                        <span className="text-stone-500 text-sm"> {pitcher.pitchHand.code}HP</span>
                    </p>
                    <p className="text-md">{stats?.summary}</p>
                    <p className="text-md">{numPitches} PIT ({numStrikes} STR)</p>
                    <p className="text-sm text-neutral-600">{summary}</p>
                </div>
            </div>
        </fieldset>
    );
}

const getBatterSlash = (stats: BattingStats | null) => {
    if (!stats) {
        return "";
    }

    const avg = stats.avg;
    const obp = stats.obp;
    const slg = stats.slg;

    if(avg == null || obp == null || slg == null) {
        return "";
    }

    return `${stats.avg}/${stats.obp}/${stats.slg}`;
}

const CurrentBatterCard = () => {
    const gameData = useLiveGameContext();

    const currentPlay = gameData.liveData.plays.currentPlay;
    if (!currentPlay) { return null; }

    const batter = getPlayerFromGumbo(gameData, currentPlay.matchup.batter.id);
    if (!batter) { return null; }

    const stats = getBatterStatsFromGumbo(gameData, batter.id);
    const seasonStats = getBatterSeasonStatsFromGumbo(gameData, batter.id);

    const slash = getBatterSlash(seasonStats);
    const summary = seasonStats ? `${slash}, ${seasonStats.homeRuns} HR, ${seasonStats.rbi} RBI` : "";
    const headerTextCss = clsx("text-sm", "text-neutral-600");

    return (
        <fieldset className="flex w-full max-w-md flex-col items-center gap-2 rounded border border-slate-700 px-4 pb-3 text-center lg:items-start lg:text-left">
            <legend className={clsx(headerTextCss, "px-1")}>BATTING</legend>
            <div className={clsx("flex", "items-center", "gap-3")}>
                <PlayerImage playerId={batter.id} size={75} />
                <div className="flex flex-col">
                    <p className="text-lg">
                        <span>{batter.useName}</span>
                        <span className="font-bold"> {batter.lastName}</span>
                        <span className="ms-2 text-stone-500 text-sm">
                            <span className={clsx(batter.batSide.code == "R" && "hidden")}>({batter.batSide.code}) </span>
                            {batter.primaryPosition.abbreviation}
                        </span>
                    </p>
                    <p>{stats?.summary}</p>
                    <p className="text-sm text-neutral-600">{summary}</p>
                </div>
            </div>
        </fieldset>
    )
}

const LinescoreTable = ({ linescore, awayTeam, homeTeam }: { linescore: Linescore, awayTeam: TeamData, homeTeam: TeamData }) => {
    const currentInning = linescore.currentInning || 0;
    const isTopInning = linescore.inningHalf === "Top";
    const totalInnings = Math.max(9, currentInning, ...linescore.innings.map((inning) => inning.num));
    const inningNumbers = Array.from({ length: totalInnings }, (_, index) => index + 1);
    const inningsByNumber = new Map(linescore.innings.map((inning) => [inning.num, inning]));

    return (
        <table className="table-fixed text-lg text-center min-w-max">
            <thead>
                <tr>
                    <th></th>
                    {inningNumbers.map((inningNum) => (
                        <th className="px-2 text-stone-600" key={inningNum}>{inningNum}</th>
                    ))}
                    <th className="ps-10 pe-2">R</th>
                    <th className="px-2">H</th>
                    <th className="px-2">E</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="font-bold pe-5">{awayTeam.abbreviation}</td>
                    {inningNumbers.map((inningNum) => (
                        <InningRunsCell
                            key={inningNum}
                            runs={inningsByNumber.get(inningNum)?.away.runs}
                            inningNum={inningNum}
                            currentInning={currentInning}
                            isTopHalf={isTopInning}
                            isHome={false}
                        />
                    ))}
                    <td className="ps-10 pe-2 font-bold">{linescore.teams.away.runs}</td>
                    <td className="px-2 font-bold">{linescore.teams.away.hits}</td>
                    <td className="px-2 font-bold">{linescore.teams.away.errors}</td>
                </tr>
                <tr>
                    <td className="font-bold pe-5">{homeTeam.abbreviation}</td>
                    {inningNumbers.map((inningNum) => (
                        <InningRunsCell
                            key={inningNum}
                            runs={inningsByNumber.get(inningNum)?.home.runs}
                            inningNum={inningNum}
                            currentInning={currentInning}
                            isTopHalf={isTopInning}
                            isHome={true}
                        />
                    ))}
                    <td className="ps-10 pe-2 font-bold">{linescore.teams.home.runs}</td>
                    <td className="px-2 font-bold">{linescore.teams.home.hits}</td>
                    <td className="px-2 font-bold">{linescore.teams.home.errors}</td>
                </tr>
            </tbody>
        </table>
    );
}

const InningRunsCell = ({ runs, inningNum, currentInning, isTopHalf, isHome }: { runs?: number, inningNum: number, currentInning: number, isTopHalf: boolean, isHome: boolean }) => {
    const isCurrentHalf = isHome ? !isTopHalf : isTopHalf;
    const isCurrent = inningNum == currentInning && isCurrentHalf;
    const isFutureInning = typeof runs !== "number";

    const noRunsYet = runs === 0 && isCurrent;
    const shouldHide = isFutureInning || (isHome && inningNum == currentInning && isTopHalf) || noRunsYet;

    const classes = clsx("px-2", isCurrent && "bg-yellow-300/50", isCurrent && (isHome ? "rounded-tr-lg" : "rounded-tl-lg"), shouldHide && "text-transparent");

    return (
        <td className={classes}>{runs ?? 0}</td>
    );
}

const GameStatusBox = ({ linescore }: { linescore: Linescore }) => {
    const gameData = useLiveGameContext();
    const balls = gameData.liveData.plays.currentPlay?.count.balls;
    const strikes = gameData.liveData.plays.currentPlay?.count.strikes;
    const count = balls != null && strikes != null ? `${balls}-${strikes}` : null;

    return (
        <div className="flex w-full max-w-sm items-center justify-center gap-12 text-center">
            <p>{linescore.inningState} {linescore.currentInningOrdinal}</p>
            <div className="flex flex-col gap-2 items-center">
                <GameBasesState linescore={linescore} />
                <BaseballOuts outs={linescore.outs ?? 0} />
            </div>
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
    const outerClasses = clsx("flex", "w-full", "max-w-2xl", "flex-col", "items-center", "gap-3", "rounded-lg", "border", "border-slate-200", "bg-white/60", "px-4", "py-3", "sm:flex-row", "sm:justify-between", "2xl:max-w-[34rem]", isHome && "sm:flex-row-reverse", isHome && "sm:text-right");

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

const TeamName = ({ team }: { team: TeamData }) => {
    const franchiseName = team.franchiseName;
    const teamName = team.clubName;
    const showFranchiseName = franchiseName !== teamName;

    return (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-lg leading-tight">
            {showFranchiseName && <span className="text-stone-500">{franchiseName}</span>}
            <span className="font-bold">{teamName}</span>
        </p>
    );
}

const TeamRecord = ({ team }: { team: TeamData }) => {
    const { wins, losses, winningPercentage } = team.record;

    return (
        <p className="text-sm text-neutral-600">
            {wins}-{losses} ({winningPercentage})
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