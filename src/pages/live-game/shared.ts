import type { BoxscorePlayer, BoxscoreTeamData, GumboFeed } from "@/types/gumbo";

export type LiveGameTab = "summary" | "preview" | "at-bat" | "offense" | "pitching" | "settings";

export const getLiveGameTabId = (tab: LiveGameTab) => `live-game-${tab}-tab`;

export const getLiveGamePanelId = (tab: LiveGameTab) => `live-game-${tab}-panel`;

export const getPlayerPosition = (player: BoxscorePlayer) => {
    return player.position?.abbreviation ?? player.allPositions?.at(-1)?.abbreviation ?? "-";
};

export const getLineupSlot = (player: BoxscorePlayer) => {
    if (!player.battingOrder) {
        return null;
    }

    const battingOrder = Number.parseInt(player.battingOrder, 10);
    if (Number.isNaN(battingOrder)) {
        return null;
    }

    return Math.floor(battingOrder / 100);
};

export const getCurrentOffenseBoxscore = (gameData: GumboFeed) => {
    const offenseTeamId = gameData.liveData.linescore.offense?.team.id;

    if (offenseTeamId === gameData.liveData.boxscore.teams.away.team.id) {
        return gameData.liveData.boxscore.teams.away;
    }

    if (offenseTeamId === gameData.liveData.boxscore.teams.home.team.id) {
        return gameData.liveData.boxscore.teams.home;
    }

    return null;
};

export const getCurrentLineup = (team: BoxscoreTeamData) => {
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

export const getStartingLineup = (team: BoxscoreTeamData) => {
    const players = Object.values(team.players);
    const startersBySlot = new Map<number, BoxscorePlayer>();

    for (const player of players) {
        const lineupSlot = getLineupSlot(player);

        if (!lineupSlot) {
            continue;
        }

        const currentStarter = startersBySlot.get(lineupSlot);

        if (!currentStarter) {
            startersBySlot.set(lineupSlot, player);
            continue;
        }

        const currentOrder = Number.parseInt(currentStarter.battingOrder ?? "999", 10);
        const nextOrder = Number.parseInt(player.battingOrder ?? "999", 10);

        if (nextOrder <= currentOrder) {
            startersBySlot.set(lineupSlot, player);
        }
    }

    const lineup = Array.from(startersBySlot.entries())
        .sort(([leftSlot], [rightSlot]) => leftSlot - rightSlot)
        .map(([slot, player]) => ({
            slot,
            player,
        }));

    return lineup.length > 0 ? lineup : getCurrentLineup(team);
};