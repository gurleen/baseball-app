import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useGameData } from "@/hooks/useGameData";
import { getBatterStatsFromGumbo, getCurrentMatchupPitches, getPitcherStatsFromGumbo, getPlayerFromGumbo, type GumboFeed, type MatchupPitch, type Linescore, type Play, type TeamData, type TeamLineScore, getPitcherSeasonStatsFromGumbo, getBatterSeasonStatsFromGumbo, BattingStats, GameData } from "@/types/gumbo";
import { TeamLogo } from "@/components/TeamLogo";
import clsx from "clsx";
import { BaseballDiamond, BaseballOuts } from "@/components/Baseball";
import { PlayerImage } from "@/components/PlayerImg";
import { getStrikeZoneHeight } from "@/components/StrikeZone";
import AtBatTabPanel from "./live-game/AtBatTabPanel";
import OffenseTabPanel from "./live-game/OffenseTabPanel";
import PitchingTabPanel from "./live-game/PitchingTabPanel";
import PreviewTabPanel from "./live-game/PreviewTabPanel";
import SettingsTabPanel from "./live-game/SettingsTabPanel";
import SummaryTabPanel from "./live-game/SummaryTabPanel";
import { getLiveGamePanelId, getLiveGameTabId, type LiveGameTab } from "./live-game/shared";
import usePageTitle from "@/hooks/usePageTitle";

type GameDataContextValue = {
    gameData: GumboFeed;
    displayDelayMs: number;
    isDisplayPaused: boolean;
    setDisplayDelayMs: (delayMs: number) => void;
    setIsDisplayPaused: (isPaused: boolean) => void;
};

const GameDataContext = createContext<GameDataContextValue | null>(null);
const DESKTOP_STRIKE_ZONE_WIDTH = 350;
const MOBILE_STRIKE_ZONE_WIDTH = 280;

const hasCompletedPlayResult = (play: Play) => {
    return play.about.isComplete && (Boolean(play.result.event) || Boolean(play.result.eventType) || Boolean(play.result.description));
};

const isGameFinal = (gameData: GumboFeed) => {
    return gameData.gameData.status.abstractGameState === "Final" || gameData.gameData.status.detailedState === "Final";
};

const isGamePregame = (gameData: GumboFeed) => {
    const { abstractGameState, detailedState } = gameData.gameData.status;

    return abstractGameState === "Preview" || detailedState === "Pre-Game" || detailedState === "Warmup";
};

const getCalibrationPitchKey = (currentPlay: Play | null | undefined, pitch: MatchupPitch | null) => {
    if (!currentPlay || !pitch) {
        return null;
    }

    return [
        currentPlay.atBatIndex,
        pitch.count ?? "",
        pitch.result ?? "",
        pitch.pitchType ?? "",
        pitch.pitchData.startSpeed ?? "",
    ].join(":");
};

function useLiveGameContext() {
    const value = useContext(GameDataContext);

    if (!value) {
        throw new Error("useLiveGameContext must be used within LiveGame");
    }

    return value.gameData;
}

function useLiveGameController() {
    const value = useContext(GameDataContext);

    if (!value) {
        throw new Error("useLiveGameController must be used within LiveGame");
    }

    return value;
}

function getPageTitle({gameData, liveData}: GumboFeed) {
    const awayAbbr = gameData.teams.away.abbreviation;
    const awayScore = liveData.linescore.teams.away.runs;
    const homeAbbr = gameData.teams.home.abbreviation;
    const homeScore = liveData.linescore.teams.home.runs;
    const inningTopBot = liveData.linescore.isTopInning ? "↑" : "↓";
    const inningOrdinal = liveData.linescore.currentInningOrdinal;

    return `${awayAbbr} ${awayScore} @ ${homeAbbr} ${homeScore} ${inningTopBot} ${inningOrdinal}`;
}

function LiveGameSummary() {
    const gameData = useLiveGameContext();
    const currentPlay = gameData.liveData.plays.currentPlay;
    const gameIsFinal = isGameFinal(gameData);
    
    const title = useMemo(() => getPageTitle(gameData), [gameData]);
    usePageTitle(title);

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

                {currentPlay && !gameIsFinal && <MatchupRow />}
            </div>

            <CurrentMatchupStrikeZone />
        </div>
    );
}

const CurrentMatchupStrikeZone = () => {
    const liveGameController = useLiveGameController();
    const gameData = liveGameController.gameData;
    const currentPlay = gameData.liveData.plays.currentPlay;
    const gameIsFinal = isGameFinal(gameData);
    const gameIsPregame = isGamePregame(gameData);
    const [settingsPitch, setSettingsPitch] = useState<MatchupPitch | null>(null);
    const [settingsPitchReceivedAt, setSettingsPitchReceivedAt] = useState<number | null>(null);
    const [latestDisplayedPitchKey, setLatestDisplayedPitchKey] = useState<string | null>(null);
    const [latestDisplayedPitchReceivedAt, setLatestDisplayedPitchReceivedAt] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<LiveGameTab>(() => {
        if (gameIsFinal) {
            return "summary";
        }

        if (gameIsPregame) {
            return "preview";
        }

        return currentPlay ? "at-bat" : "settings";
    });
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

    useEffect(() => {
        if (gameIsFinal) {
            setActiveTab((currentTab) => currentTab === "summary" ? currentTab : "summary");
            return;
        }

        setActiveTab((currentTab) => {
            if (currentTab !== "summary") {
                return currentTab;
            }

            if (gameIsPregame) {
                return "preview";
            }

            return currentPlay ? "at-bat" : "settings";
        });
    }, [currentPlay, gameIsFinal, gameIsPregame]);

    const batter = currentPlay ? getPlayerFromGumbo(gameData, currentPlay.matchup.batter.id) : null;
    const canShowAtBat = Boolean(currentPlay && batter);
    const pitches = currentPlay ? getCurrentMatchupPitches(gameData) : [];
    const latestPitch = pitches.at(-1) ?? null;
    const latestPitchKey = getCalibrationPitchKey(currentPlay, latestPitch);

    useEffect(() => {
        if (!latestPitchKey) {
            setLatestDisplayedPitchKey(null);
            setLatestDisplayedPitchReceivedAt(null);
            return;
        }

        if (latestDisplayedPitchKey !== latestPitchKey) {
            setLatestDisplayedPitchKey(latestPitchKey);
            setLatestDisplayedPitchReceivedAt(Date.now());
        }
    }, [latestDisplayedPitchKey, latestPitchKey]);

    useEffect(() => {
        if (activeTab !== "settings") {
            setSettingsPitch(null);
            setSettingsPitchReceivedAt(null);
            return;
        }

        if (!settingsPitch && latestPitch) {
            setSettingsPitch(latestPitch);
            setSettingsPitchReceivedAt(latestDisplayedPitchReceivedAt ?? Date.now());
        }
    }, [activeTab, latestDisplayedPitchReceivedAt, latestPitch, settingsPitch]);

    useEffect(() => {
        if (!canShowAtBat && activeTab === "at-bat") {
            setActiveTab(gameIsPregame ? "preview" : "settings");
        }
    }, [activeTab, canShowAtBat, gameIsPregame]);

    const strikeZoneHeight = batter ? getStrikeZoneHeight({
        strikeZoneTop: batter.strikeZoneTop,
        strikeZoneBottom: batter.strikeZoneBottom,
        width: strikeZoneWidth,
    }) : 0;

    const finishDelayCalibration = () => {
        if (settingsPitchReceivedAt == null) {
            return;
        }

        liveGameController.setDisplayDelayMs(Math.max(0, Date.now() - settingsPitchReceivedAt));
    };

    const resetDelay = () => {
        liveGameController.setDisplayDelayMs(0);
    };

    const adjustDelayByOneSecond = (direction: -1 | 1) => {
        liveGameController.setDisplayDelayMs(Math.max(0, liveGameController.displayDelayMs + (direction * 1000)));
    };

    return (
        <section className="mt-6 flex w-full self-stretch flex-col">
            <div role="tablist" aria-label="Live game detail tabs" className="flex items-end gap-2 border-b border-slate-300">
                {gameIsFinal && (
                    <LiveGameTabButton
                        tab="summary"
                        label="SUMMARY"
                        activeTab={activeTab}
                        onSelect={setActiveTab}
                    />
                )}
                <LiveGameTabButton
                    tab="preview"
                    label="PREVIEW"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
                {canShowAtBat && (
                <LiveGameTabButton
                    tab="at-bat"
                    label="AT BAT"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
                )}
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
                <LiveGameTabButton
                    tab="settings"
                    label="SETTINGS"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
            </div>
            {gameIsFinal && activeTab === "summary" && <SummaryTabPanel gameData={gameData} />}
            {activeTab === "preview" && <PreviewTabPanel gameData={gameData} />}
            {currentPlay && canShowAtBat && batter && activeTab === "at-bat" && (
                <AtBatTabPanel
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
            {activeTab === "settings" && (
                <SettingsTabPanel
                    latestPitch={settingsPitch}
                    displayDelayMs={liveGameController.displayDelayMs}
                    calibrationPitchReceivedAt={settingsPitchReceivedAt}
                    onSubtractSecond={() => adjustDelayByOneSecond(-1)}
                    onAddSecond={() => adjustDelayByOneSecond(1)}
                    onResumeCalibration={finishDelayCalibration}
                    onResetDelay={resetDelay}
                />
            )}
        </section>
    );
}

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
                "rounded-t-md border border-b-0 px-4 py-2 text-sm font-semibold tracking-wide hover:cursor-pointer underline decoration-transparent hover:decoration-current transition duration-200",
                isActive ? "border-slate-700 bg-slate-900 text-white" : "border-slate-300 bg-white/70 text-slate-600"
            )}
        >
            {label}
        </button>
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
    const gameData = useLiveGameContext();
    const isFinal = isGameFinal(gameData);
    
    const isCurrentHalf = isHome ? !isTopHalf : isTopHalf;
    const isCurrent = inningNum == currentInning && isCurrentHalf;
    const isFutureInning = typeof runs !== "number";

    const noRunsYet = runs === 0 && isCurrent;
    const shouldHide = (isFutureInning || (isHome && inningNum == currentInning && isTopHalf) || noRunsYet) && !isFinal;

    const classes = clsx("px-2", isCurrent && "bg-yellow-300/50", isCurrent && (isHome ? "rounded-tr-lg" : "rounded-tl-lg"), shouldHide && "text-transparent");

    return (
        <td className={classes}>{runs ?? 0}</td>
    );
}

const GameStatusBox = ({ linescore }: { linescore: Linescore }) => {
    const gameData = useLiveGameContext();
    const isFinal = isGameFinal(gameData);
    
    if(isFinal) {
        return (
            <div className="flex w-full mt-3 justify-center items-center">
                <p className="text-3xl font-black text-neutral-700">Final</p>
            </div>
        )
    }
    
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
    usePageTitle("Live Game");
    const { gameId } = useParams();

    if (!gameId) {
        return (
            <div className="flex min-h-full items-center justify-center">
                <p className="text-red-600">No game ID provided.</p>
            </div>
        );
    }

    const gameData = useGameData({ gameId });
    const gameDataContextValue = gameData.data ? {
        gameData: gameData.data,
        displayDelayMs: gameData.displayDelayMs,
        isDisplayPaused: gameData.isDisplayPaused,
        setDisplayDelayMs: gameData.setDisplayDelayMs,
        setIsDisplayPaused: gameData.setIsDisplayPaused,
    } satisfies GameDataContextValue : null;

    return (
        <main className="min-h-full px-3 py-6 md:px-8 md:py-5 border-2 border-neutral-200 bg-gray-500/10 drop-shadow-gray-900 drop-shadow-xl/40 lg:mx-10 font-mono">
            {gameData.isLoading && <p className="text-neutral-600">Loading game data...</p>}
            {gameData.error && <p className="text-red-600">Error loading game data: {gameData.error.message}</p>}
            {gameDataContextValue && (
                <GameDataContext.Provider value={gameDataContextValue}>
                    <LiveGameSummary />
                </GameDataContext.Provider>
            )}
        </main>
    )
}