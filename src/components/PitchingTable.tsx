import { getPlayerFromGumbo, type BoxscorePlayer, type BoxscoreTeamData, type GumboFeed, type PitchingStats } from "@/types/gumbo";

interface PitchingTableProps {
	team: BoxscoreTeamData;
	gameData: GumboFeed;
}

const formatNumberStat = (value?: number) => {
	return typeof value === "number" ? value : 0;
};

const formatDisplayStat = (value?: number | string) => {
	if (typeof value === "number") {
		return value;
	}

	if (typeof value === "string" && value.length > 0) {
		return value;
	}

	return "-";
};

const formatPitchStrikeStat = (pitches?: number, strikes?: number) => {
	return `${formatNumberStat(pitches)}-${formatNumberStat(strikes)}`;
};

const getOrderedPlayers = (playerIds: number[], team: BoxscoreTeamData) => {
	const seenPlayerIds = new Set<number>();

	return playerIds
		.filter((playerId) => {
			if (seenPlayerIds.has(playerId)) {
				return false;
			}

			seenPlayerIds.add(playerId);
			return true;
		})
		.map((playerId) => team.players[`ID${playerId}`])
		.filter((player): player is BoxscorePlayer => Boolean(player));
};

const hasEnteredGameAsPitcher = (player: BoxscorePlayer) => {
	return player.stats.pitching.inningsPitched != "-";
};

const getPitchingTotals = (team: BoxscoreTeamData): PitchingStats => {
	return team.teamStats.pitching;
};

const isProbableStarter = (player: BoxscorePlayer, team: BoxscoreTeamData, gameData: GumboFeed) => {
	const probablePitchers = gameData.gameData.probablePitchers;

	if (!probablePitchers) {
		return false;
	}

	const probableStarterId = team.team.id === gameData.gameData.teams.away.id
		? probablePitchers.away.id
		: probablePitchers.home.id;

	return probableStarterId === player.person.id;
};

const getPitcherRole = (player: BoxscorePlayer, team: BoxscoreTeamData, gameData: GumboFeed) => {
	const seasonStats = player.seasonStats.pitching;
	const gamesStarted = seasonStats.gamesStarted ?? 0;
	const gamesPitched = seasonStats.gamesPitched ?? seasonStats.gamesPlayed ?? 0;
	const reliefAppearances = Math.max(gamesPitched - gamesStarted, 0);

	if (team.pitchers[0] === player.person.id || isProbableStarter(player, team, gameData)) {
		return "SP";
	}

	if (gamesStarted > 0 && gamesStarted >= reliefAppearances) {
		return "SP";
	}

	if (reliefAppearances > 0 || team.bullpen.includes(player.person.id) || team.pitchers.includes(player.person.id)) {
		return "RP";
	}

	return player.position?.abbreviation ?? player.allPositions?.at(-1)?.abbreviation ?? "P";
};

const getPitcherMetadata = (player: BoxscorePlayer, team: BoxscoreTeamData, gameData: GumboFeed) => {
	const playerProfile = getPlayerFromGumbo(gameData, player.person.id);
	const handedness = playerProfile?.pitchHand.code ? playerProfile.pitchHand.code : null;
	const role = getPitcherRole(player, team, gameData);

	return [handedness, role].filter(Boolean).join(" ");
};

export default function PitchingTable({ team, gameData }: PitchingTableProps) {
	const activePitchers = getOrderedPlayers(team.pitchers, team).filter(hasEnteredGameAsPitcher);
	const bullpenPitchers = getOrderedPlayers(team.bullpen, team);
	const totals = getPitchingTotals(team);

	return (
		<div className="flex flex-col gap-4">
			<div className="overflow-hidden border border-slate-300 bg-white/80">
				<div className="border-b border-slate-300 px-4 py-3">
				<p className="text-sm font-semibold tracking-wide text-slate-700">{team.team.name}</p>
					<p className="text-xs font-semibold tracking-wide text-slate-500">IN GAME</p>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-lg table-fixed text-left text-sm">
					<thead className="bg-slate-100 text-slate-600">
						<tr>
							<th className="w-[28%] px-3 py-2 font-semibold">Pitcher</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">IP</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">PIT-STR</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">H</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">R</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">ER</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">BB</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">K</th>
							<th className="w-[9%] px-3 py-2 font-semibold text-center">HR</th>
						</tr>
					</thead>
					<tbody>
						{activePitchers.map((player) => (
							<tr key={player.person.id} className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50">
								<td className="px-3 py-2 text-slate-700">
									<div className="flex items-baseline justify-between gap-3">
										<span className="font-medium">{player.person.fullName}</span>
										<span className="shrink-0 text-xs uppercase tracking-wide text-slate-500">{getPitcherMetadata(player, team, gameData)}</span>
									</div>
								</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatDisplayStat(player.stats.pitching.inningsPitched)}</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatPitchStrikeStat(player.stats.pitching.pitchesThrown, player.stats.pitching.strikes)}</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatNumberStat(player.stats.pitching.hits)}</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatNumberStat(player.stats.pitching.runs)}</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatNumberStat(player.stats.pitching.earnedRuns)}</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatNumberStat(player.stats.pitching.baseOnBalls)}</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatNumberStat(player.stats.pitching.strikeOuts)}</td>
								<td className="px-3 py-2 text-center text-slate-700">{formatNumberStat(player.stats.pitching.homeRuns)}</td>
							</tr>
						))}
						<tr className="border-t-2 border-slate-300 bg-slate-100/80">
							<td className="px-3 py-2 font-semibold text-slate-800">TOTAL</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatDisplayStat(totals.inningsPitched)}</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatPitchStrikeStat(totals.pitchesThrown, totals.strikes)}</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatNumberStat(totals.hits)}</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatNumberStat(totals.runs)}</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatNumberStat(totals.earnedRuns)}</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatNumberStat(totals.baseOnBalls)}</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatNumberStat(totals.strikeOuts)}</td>
							<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatNumberStat(totals.homeRuns)}</td>
						</tr>
					</tbody>
					</table>
				</div>
			</div>

			<div className="overflow-hidden border border-slate-300 bg-white/80">
				<div className="border-b border-slate-300 px-4 py-3">
					<p className="text-xs font-semibold tracking-wide text-slate-500">BULLPEN</p>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-lg table-fixed text-left text-sm">
						<thead className="bg-slate-100 text-slate-600">
							<tr>
								<th className="w-[40%] px-3 py-2 font-semibold">Pitcher</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">W-L</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">ERA</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">IP</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">WHIP</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">K</th>
							</tr>
						</thead>
						<tbody>
							{bullpenPitchers.map((player) => (
								<tr key={player.person.id} className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50">
									<td className="px-3 py-2 text-slate-700">
										<div className="flex items-baseline justify-between gap-3">
											<span className="font-medium">{player.person.fullName}</span>
											<span className="shrink-0 text-xs uppercase tracking-wide text-slate-500">{getPitcherMetadata(player, team, gameData)}</span>
										</div>
									</td>
									<td className="px-3 py-2 text-center text-slate-700">
										{`${formatNumberStat(player.seasonStats.pitching.wins)}-${formatNumberStat(player.seasonStats.pitching.losses)}`}
									</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatDisplayStat(player.seasonStats.pitching.era)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatDisplayStat(player.seasonStats.pitching.inningsPitched)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatDisplayStat(player.seasonStats.pitching.whip)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatNumberStat(player.seasonStats.pitching.strikeOuts)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}