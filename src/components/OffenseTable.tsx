import type { BoxscorePlayer, BoxscoreTeamData } from "@/types/gumbo";

interface OffenseTableProps {
	team: BoxscoreTeamData;
}

const getPlayerPosition = (player: BoxscorePlayer) => {
	return player.position?.abbreviation ?? player.allPositions?.at(-1)?.abbreviation ?? "-";
};

const formatStat = (value?: number) => {
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

const getOrderedBatters = (team: BoxscoreTeamData) => {
	const orderedIds = [...team.battingOrder, ...team.batters];
	const pitcherIds = new Set(team.pitchers);

	return getOrderedPlayers(orderedIds, team)
		.filter((player): player is BoxscorePlayer => Boolean(player) && getPlayerPosition(player) !== "P");
};

const getBenchPlayers = (team: BoxscoreTeamData) => {
	const activeBatterIds = new Set(getOrderedBatters(team).map((player) => player.person.id));
	const pitcherIds = new Set(team.pitchers);

	return getOrderedPlayers(team.bench, team).filter(
		(player) => !activeBatterIds.has(player.person.id) && !pitcherIds.has(player.person.id) && getPlayerPosition(player) !== "P",
	);
};

export default function OffenseTable({ team }: OffenseTableProps) {
	const batters = getOrderedBatters(team);
	const benchPlayers = getBenchPlayers(team);
	const totals = team.teamStats.batting;

	return (
		<div className="flex flex-col gap-4">
			<div className="overflow-hidden border border-slate-300 bg-white/80">
				<div className="border-b border-slate-300 px-4 py-3">
					<p className="text-sm font-semibold tracking-wide text-slate-700">{team.team.name}</p>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-lg table-fixed text-left text-sm">
						<thead className="bg-slate-100 text-slate-600">
							<tr>
								<th className="w-[44%] px-3 py-2 font-semibold">Batter</th>
								<th className="w-[9%] px-3 py-2 font-semibold text-center">AB</th>
								<th className="w-[9%] px-3 py-2 font-semibold text-center">R</th>
								<th className="w-[9%] px-3 py-2 font-semibold text-center">H</th>
								<th className="w-[9%] px-3 py-2 font-semibold text-center">RBI</th>
								<th className="w-[9%] px-3 py-2 font-semibold text-center">BB</th>
								<th className="w-[9%] px-3 py-2 font-semibold text-center">K</th>
							</tr>
						</thead>
						<tbody>
							{batters.map((player) => (
								<tr key={player.person.id} className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50">
									<td className="px-3 py-2 text-slate-700">
										<div className="flex items-baseline justify-between gap-3">
											<span className="font-medium">{player.person.fullName}</span>
											<span className="shrink-0 text-xs uppercase tracking-wide text-slate-500">{getPlayerPosition(player)}</span>
										</div>
									</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.stats.batting.atBats)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.stats.batting.runs)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.stats.batting.hits)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.stats.batting.rbi)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.stats.batting.baseOnBalls)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.stats.batting.strikeOuts)}</td>
								</tr>
							))}
							<tr className="border-t-2 border-slate-300 bg-slate-100/80">
								<td className="px-3 py-2 font-semibold text-slate-800">TOTAL</td>
								<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatStat(totals.atBats)}</td>
								<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatStat(totals.runs)}</td>
								<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatStat(totals.hits)}</td>
								<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatStat(totals.rbi)}</td>
								<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatStat(totals.baseOnBalls)}</td>
								<td className="px-3 py-2 text-center font-semibold text-slate-800">{formatStat(totals.strikeOuts)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div className="overflow-hidden border border-slate-300 bg-white/80">
				<div className="border-b border-slate-300 px-4 py-3">
					<p className="text-xs font-semibold tracking-wide text-slate-500">BENCH</p>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-lg table-fixed text-left text-sm">
						<thead className="bg-slate-100 text-slate-600">
							<tr>
								<th className="w-[40%] px-3 py-2 font-semibold">Batter</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">AVG</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">OPS</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">AB</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">HR</th>
								<th className="w-[12%] px-3 py-2 font-semibold text-center">RBI</th>
							</tr>
						</thead>
						<tbody>
							{benchPlayers.map((player) => (
								<tr key={player.person.id} className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50">
									<td className="px-3 py-2 text-slate-700">
										<div className="flex items-baseline justify-between gap-3">
											<span className="font-medium">{player.person.fullName}</span>
											<span className="shrink-0 text-xs uppercase tracking-wide text-slate-500">{getPlayerPosition(player)}</span>
										</div>
									</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatDisplayStat(player.seasonStats.batting.avg)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatDisplayStat(player.seasonStats.batting.ops)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.seasonStats.batting.atBats)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.seasonStats.batting.homeRuns)}</td>
									<td className="px-3 py-2 text-center text-slate-700">{formatStat(player.seasonStats.batting.rbi)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}