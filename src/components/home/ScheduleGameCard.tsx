import type { BattingStats, PitchingStats } from "@/types/gumbo";
import type { ScheduleGame, ScheduleLineScoreEntry, ScheduleOffensePlayer, ScheduleProbablePitcher, ScheduleTeamSide } from "../../types/schedule";
import { BaseballDiamond, BaseballOuts } from "../Baseball";
import { PlayerImage } from "../PlayerImg";
import { TeamLogo } from "../TeamLogo";
import { HorizontalDivider, VerticalDivider } from "../Util";
import clsx from "clsx";
import { LinkButton } from "../ui/LinkButton";

function formatGameTime(gameDate: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(gameDate));
}

interface ScheduleGameCardProps {
    game: ScheduleGame;
}

export function ScheduleGameCard({ game }: ScheduleGameCardProps) {
    const gameInWarmup = game.status.detailedState === "Warmup";
    const gameInProgress = game.statusFlags.isLive;
    const gameFinal = game.statusFlags.isFinal;
    const gameBetweenInnings = game.linescore?.inningState === "Middle" || game.linescore?.inningState === "End";

    const showInningText = gameInProgress && !gameInWarmup;
    const showAtBatInfo = gameInProgress && !gameBetweenInnings && !gameInWarmup;
    const showStartingPitchers = (!gameInProgress || gameInWarmup) && !gameFinal;
    const showOtherGameStatus = !gameInProgress && !gameInWarmup && !gameFinal;

    const teamRowsCss = clsx("flex", "flex-col", "justify-center", "gap-2", gameInProgress && "col-span-9", !gameInProgress && "col-span-12");

    return (
        <div className="flex flex-col grow border border-neutral-200 basis-md px-4 py-3 font-mono bg-white/95">
            <div className="flex w-full justify-between">
                {showInningText && <InningText game={game} />}
                {gameInWarmup && <WarmupText game={game} />}
                {gameFinal && <FinalText game={game} />}
                {showOtherGameStatus && <p className="font-bold">{game.status.detailedState} - {formatGameTime(game.gameDate)}</p>}

                <LinkButton href={`/live/${game.gamePk}`}>Live View</LinkButton>
            </div>

            <HorizontalDivider className="my-1" />

            <div className="grid grid-cols-12">
                <div className={teamRowsCss}>
                    <HeaderRow />
                    <TeamRow side={game.teams.away} line={game.linescore?.teams?.away} />
                    <TeamRow side={game.teams.home} line={game.linescore?.teams?.home} />
                </div>

                {gameInProgress && <VerticalDivider className="mx-4" />}

                {gameInProgress && <div className="flex flex-col w-full gap-2 pe-5 justify-center items-center col-span-2">
                    <GameBasesState game={game} />
                    <GameOuts game={game} />
                    <p>{game.linescore?.balls}-{game.linescore?.strikes}</p>
                </div>}
            </div>

            <HorizontalDivider className="my-1" />

            {showAtBatInfo && <AtBatInfo game={game} />}
            {showStartingPitchers && <StartingPitchers game={game} />}
            {gameFinal && <PitchersOfRecord game={game} />}
            {gameInProgress && gameBetweenInnings && <BattersDueUp game={game} />}
        </div>
    );
}

const AtBatInfo = ({ game }: { game: ScheduleGame }) => {
    const isInInning = game.linescore?.inningState == "Top" || game.linescore?.inningState == "Bottom";
    const isInningTop = game.linescore?.inningState === "Top";

    const battingTeam = isInInning ? (isInningTop ? game.teams.away : game.teams.home) : null;
    const pitchingTeam = isInInning ? (isInningTop ? game.teams.home : game.teams.away) : null;

    const currentBatter = game.linescore?.offense?.batter;
    const currentPitcher = game.linescore?.defense?.pitcher;

    return (
        <div className="grid grid-cols-2">
                <div className="flex flex-col gap-1">
                    <p className="text-sm">PITCHING {pitchingTeam?.team.abbreviation}</p>
                    {currentPitcher && <PitcherCard player={currentPitcher} />}
                </div>

                <div className="flex flex-col gap-1">
                    <p className="text-sm">BATTING {battingTeam?.team.abbreviation}</p>
                    {currentBatter && <BatterCard player={currentBatter} />}
                </div>
            </div>
    );
}

const StartingPitchers = ({ game }: { game: ScheduleGame }) => {
    const awayPitcher = game.teams.away.probablePitcher;
    const homePitcher = game.teams.home.probablePitcher;

    return (
        <div className="grid grid-cols-2">
            <div className="flex flex-col gap-1">
                <p className="text-sm">STARTING PITCHER {game.teams.away.team.abbreviation}</p>
                {awayPitcher && <PitcherCard player={awayPitcher} />}
            </div>

            <div className="flex flex-col gap-1">
                <p className="text-sm">STARTING PITCHER {game.teams.home.team.abbreviation}</p>
                {homePitcher && <PitcherCard player={homePitcher} />}
            </div>
        </div>
    );
}

const PitchersOfRecord = ({ game }: { game: ScheduleGame }) => {
    const winningPitcher = game.decisions?.winner;
    const losingPitcher = game.decisions?.loser;
    const savePitcher = game.decisions?.save;

    return (
        <div className="grid grid-cols-2 gap-1">
            <div className="flex flex-col gap-1">
                <p className="text-sm">WINNER</p>
                {winningPitcher && <PitcherCard player={winningPitcher} useGameStats />}
            </div>

            <div className="flex flex-col gap-1">
                <p className="text-sm">LOSER</p>
                {losingPitcher && <PitcherCard player={losingPitcher} useGameStats />}
            </div>

            {savePitcher && <div className="flex flex-col gap-1">
                <p className="text-sm">SAVE</p>
                <PitcherCard player={savePitcher} useGameStats />
            </div>}
        </div>
    );
}

const BattersDueUp = ({ game }: { game: ScheduleGame }) => {
    const atBat = game.linescore?.offense?.batter;
    const onDeck = game.linescore?.offense?.onDeck;
    const inHole = game.linescore?.offense?.inHole;

    return (
        <div className="flex flex-col gap-1">
            <p className="text-sm">DUE UP</p>
            <div className="flex justify-between gap-2">
                {atBat && <BatterCard player={atBat} useGameStats />}
                {onDeck && <BatterCard player={onDeck} useGameStats />}
                {inHole && <BatterCard player={inHole} useGameStats />}
            </div>
        </div>
    )
}

const getPitcherSeasonStats = (player: ScheduleProbablePitcher) : PitchingStats | undefined => {
    const stat = player.stats?.find(x => x.type.displayName == "statsSingleSeason" && x.group.displayName == "pitching");
    return stat?.stats as PitchingStats | undefined;
};

const getPitcherGameStats = (player: ScheduleProbablePitcher) : PitchingStats | undefined => {
    const stat = player.stats?.find(x => x.type.displayName == "gameLog" && x.group.displayName == "pitching");
    return stat?.stats as PitchingStats | undefined;
}

const getBatterSeasonStats = (player: ScheduleOffensePlayer) : BattingStats | undefined => {
    const stat = player.stats?.find(x => x.type.displayName == "statsSingleSeason" && x.group.displayName == "hitting");
    return stat?.stats;
}

const getBatterGameStats = (player: ScheduleOffensePlayer) : BattingStats | undefined => {
    const stat = player.stats?.find(x => x.type.displayName == "gameLog" && x.group.displayName == "hitting");
    return stat?.stats;
}

const PitcherCard = ({ player, useGameStats }: { player: ScheduleProbablePitcher, useGameStats?: boolean }) => {
    const seasonStats = getPitcherSeasonStats(player);
    const gameStats = getPitcherGameStats(player);
    const statsText = (useGameStats ? gameStats : seasonStats)?.summary ?? "";

    return (
        <div className="flex gap-2 items-center h-full">
            <PlayerImage playerId={player.id} size={40} />
            <div className="flex flex-col justify-start h-full">
                <p className="text-xl font-medium">{player.lastName}</p>
                <p className="text-xs font-light text-neutral-700 text-wrap">{statsText}</p>
            </div>
        </div>
    );
}

const BatterCard = ({ player, useGameStats }: { player: ScheduleOffensePlayer, useGameStats?: boolean }) => {
    const seasonStats = getBatterSeasonStats(player);
    const gameStats = getBatterGameStats(player);
    const statsText = (useGameStats ? gameStats : seasonStats)?.summary ?? "";

    return (
        <div className="flex gap-2 items-center">
            <PlayerImage playerId={player.id} size={40} />
            <div className="flex flex-col">
                <p className="text-xl font-medium">{player.lastName}</p>
                <p className="text-xs font-light text-neutral-700">{statsText}</p>
            </div>
        </div>
    );
}

const GameBasesState = ({ game }: { game: ScheduleGame }) => {
    const firstOccupied = game.linescore?.offense?.first != null;
    const secondOccupied = game.linescore?.offense?.second != null;
    const thirdOccupied = game.linescore?.offense?.third != null;

    return (
        <BaseballDiamond width={60} firstOccupied={firstOccupied} secondOccupied={secondOccupied} thirdOccupied={thirdOccupied} />
    );
}

const InningText = ({ game }: { game: ScheduleGame }) => {
    const inningOrdinal = game.linescore?.currentInningOrdinal;
    const inningState = game.linescore?.inningState;

    if (!inningOrdinal || !inningState) return (
        <p>--</p>
    );

    return (
        <p className="font-bold">{inningState} {inningOrdinal}</p>
    );
}

const WarmupText = ({ game }: { game: ScheduleGame }) => {
    const gameTime = formatGameTime(game.gameDate);

    return (
        <p className="font-bold">Warmup - {gameTime}</p>
    );
}

const FinalText = ({ game }: { game: ScheduleGame }) => {
    return (
        <p className="font-bold">Final</p>
    );
}

const HeaderRow = () => {
    return (
        <div className="grid grid-cols-10 justify-between mb-2">
            <span className="col-span-7"></span>
            
            <p className="text-sm text-center uppercase text-neutral-600 col-span-1">R</p>
            <p className="text-sm text-center uppercase text-neutral-600 col-span-1">H</p>
            <p className="text-sm text-center uppercase text-neutral-600 col-span-1">E</p>
        </div>
    );
}

const TeamRow = ({ side, line }: { side: ScheduleTeamSide, line?: ScheduleLineScoreEntry }) => {
    const team = side.team;
    const runs = side.score ?? "-";
    const hits = line?.hits ?? "-";
    const errors = line?.errors ?? "-";

    return (
        <div className="grid grid-cols-10 justify-between">
            <span className="flex items-center gap-2 col-span-7">
                <TeamLogo teamId={team.id} width={30} />
                <p className="text-lg font-medium text-neutral-950">{team.shortName}</p>
            </span>
            
            <p className="text-xl text-center font-extrabold text-black col-span-1">{runs}</p>
            <p className="text-xl text-center font-light text-black col-span-1">{hits}</p>
            <p className="text-xl text-center font-light text-black col-span-1">{errors}</p>
        </div>
    );
}

const GameOuts = ({ game }: { game: ScheduleGame }) => {
    const outs = game.linescore?.outs ?? 0;

    return (
        <BaseballOuts outs={outs} />
    );
}