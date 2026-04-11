import { useState } from "react";
import clsx from "clsx";
import PlaySummaryCard from "@/components/PlaySummaryCard";
import { getHitDataFromPlay, getMatchupPitchesFromPlay, getPlayerFromGumbo, type GumboFeed, type Play, type PlayEvent, type Runner } from "@/types/gumbo";
import { getScorecardCodeFromPlay } from "@/util/scorecard";

interface PreviousPlaysListProps {
	gameData: GumboFeed;
	height: number;
}

type PreviousPlayListItem =
	| {
		kind: "inning";
		id: string;
		label: string;
	  }
	| {
		kind: "special";
		id: string;
		event: SpecialEvent;
	  }
	| {
		kind: "play";
		id: string;
		play: Play;
	  };

interface SpecialEvent {
	index: number;
	key: string;
	eventType?: string;
	eventLabel?: string;
	description: string;
	playerId?: number;
}

const getNormalizedEventType = (eventType?: string) => eventType?.trim().toLowerCase().replaceAll(" ", "_");

const matchesEventType = (eventType: string | undefined, expectedType: string) =>
	eventType === expectedType || eventType?.startsWith(`${expectedType}_`) === true;

const isPickoffAttemptEventType = (eventType?: string) => eventType === "pickoff_1b" || eventType === "pickoff_2b" || eventType === "pickoff_3b";

const isSpecialEventType = (eventType?: string) => {
	if (!eventType) {
		return false;
	}

	return (
		eventType === "pitching_substitution"
		|| eventType === "defensive_switch"
		|| eventType === "defensive_substitution"
		|| eventType === "mound_visit"
		|| matchesEventType(eventType, "stolen_base")
		|| matchesEventType(eventType, "caught_stealing")
		|| matchesEventType(eventType, "pickoff_caught_stealing")
		|| isPickoffAttemptEventType(eventType)
	);
};

const formatInningLabel = (play: Play) => {
	const half = play.about.halfInning === "top" ? "Top" : "Bottom";
	return `${half} ${play.about.inning}`;
};

const getPlayBadgeLabel = (play: Play) => play.result.event ?? play.result.eventType ?? "Play";

const isScoringPlay = (play: Play) => play.about.isScoringPlay === true;

const getPlayStyles = (play: Play) => {
	if (isScoringPlay(play)) {
		return {
			container: "border-amber-300 bg-amber-50",
			badge: "bg-amber-700 text-white",
			scorecardCode: "text-amber-800",
		};
	}

	return {
		container: "border-slate-200 bg-white",
		badge: "bg-slate-900",
		scorecardCode: undefined,
	};
};

const getSpecialEventBadgeLabel = (event: SpecialEvent) => {
	const eventType = getNormalizedEventType(event.eventType);

	if (eventType === "mound_visit") {
		return "Mound Visit";
	}

	if (eventType === "pitching_substitution") {
		return "Pitching Change";
	}

	if (eventType === "defensive_substitution" || eventType === "defensive_switch") {
		return "Defensive Change";
	}

	if (matchesEventType(eventType, "stolen_base")) {
		return "Stolen Base";
	}

	if (matchesEventType(eventType, "caught_stealing")) {
		return "Caught Stealing";
	}

	if (matchesEventType(eventType, "pickoff_caught_stealing")) {
		return "Pickoff Caught Stealing";
	}

	if (isPickoffAttemptEventType(eventType)) {
		return "Pickoff Attempt";
	}

	return event.eventLabel ?? "Update";
};

const getSpecialEventStyles = (event: SpecialEvent) => {
	const eventType = getNormalizedEventType(event.eventType);

	if (eventType === "mound_visit") {
		return {
			container: "border-amber-300 bg-amber-50",
			badge: "bg-amber-700 text-white",
		};
	}

	if (eventType === "pitching_substitution") {
		return {
			container: "border-rose-300 bg-rose-50",
			badge: "bg-rose-700 text-white",
		};
	}

	if (matchesEventType(eventType, "stolen_base")) {
		return {
			container: "border-emerald-300 bg-emerald-50",
			badge: "bg-emerald-700 text-white",
		};
	}

	if (matchesEventType(eventType, "caught_stealing") || matchesEventType(eventType, "pickoff_caught_stealing")) {
		return {
			container: "border-orange-300 bg-orange-50",
			badge: "bg-orange-700 text-white",
		};
	}

	if (isPickoffAttemptEventType(eventType)) {
		return {
			container: "border-cyan-300 bg-cyan-50",
			badge: "bg-cyan-700 text-white",
		};
	}

	return {
		container: "border-sky-300 bg-sky-50",
		badge: "bg-sky-700 text-white",
	};
};

const getRunnerEventDescription = (runner: Runner) => {
	const runnerName = runner.details.runner.fullName;
	const eventLabel = runner.details.event;

	if (runnerName && eventLabel) {
		return `${runnerName}: ${eventLabel}`;
	}

	return eventLabel ?? runnerName ?? "No description available.";
};

const getSpecialEvents = (play: Play) => {
	const playEvents = play.playEvents.flatMap((event) => {
		const eventType = getNormalizedEventType(event.details.eventType);

		if (!isSpecialEventType(eventType)) {
			return [];
		}

		return [{
			index: event.index,
			key: `play-${event.index}`,
			eventType: event.details.eventType,
			eventLabel: event.details.event,
			description: event.details.description ?? event.details.event ?? "No description available.",
			playerId: event.player?.id,
		} satisfies SpecialEvent];
	});

	const runnerEvents = play.runners.flatMap((runner, runnerIndex) => {
		const eventType = getNormalizedEventType(runner.details.eventType);

		if (!isSpecialEventType(eventType)) {
			return [];
		}

		return [{
			index: runner.details.playIndex,
			key: `runner-${runner.details.playIndex}-${runnerIndex}-${runner.details.runner.id}`,
			eventType: runner.details.eventType,
			eventLabel: runner.details.event,
			description: getRunnerEventDescription(runner),
			playerId: runner.details.runner.id,
		} satisfies SpecialEvent];
	});

	const dedupedEvents = new Map<string, SpecialEvent>();

	for (const event of [...playEvents, ...runnerEvents]) {
		const eventType = getNormalizedEventType(event.eventType) ?? "unknown";
		const playerId = event.playerId ?? "unknown";
		const dedupeKey = `${event.index}:${eventType}:${playerId}`;

		if (!dedupedEvents.has(dedupeKey)) {
			dedupedEvents.set(dedupeKey, event);
		}
	}

	return [...dedupedEvents.values()].sort((left, right) => left.index - right.index);
};

const getPreviousPlays = (gameData: GumboFeed): Play[] => {
	const currentPlay = gameData.liveData.plays.currentPlay;
	const allPlays = gameData.liveData.plays.allPlays;

	if (!currentPlay) {
		return allPlays.slice().reverse();
	}

	return allPlays
		.filter((play) => play.atBatIndex < currentPlay.atBatIndex)
		.reverse();
};

const buildPreviousPlayList = (plays: Play[], currentPlay?: Play): PreviousPlayListItem[] => {
	const items: PreviousPlayListItem[] = [];
	let previousHalfInningLabel: string | null = null;

	if (currentPlay) {
		const currentPlaySpecialEvents = getSpecialEvents(currentPlay).slice().reverse();

		if (currentPlaySpecialEvents.length > 0) {
			const inningLabel = formatInningLabel(currentPlay);
			items.push({
				kind: "inning",
				id: `inning-${currentPlay.about.inning}-${currentPlay.about.halfInning}`,
				label: inningLabel,
			});
			previousHalfInningLabel = inningLabel;

			for (const event of currentPlaySpecialEvents) {
				items.push({
					kind: "special",
					id: `special-current-${currentPlay.atBatIndex}-${event.key}`,
					event,
				});
			}
		}
	}

	for (const play of plays) {
		const inningLabel = formatInningLabel(play);

		if (inningLabel !== previousHalfInningLabel) {
			items.push({
				kind: "inning",
				id: `inning-${play.about.inning}-${play.about.halfInning}`,
				label: inningLabel,
			});
			previousHalfInningLabel = inningLabel;
		}

		items.push({
			kind: "play",
			id: `play-${play.atBatIndex}`,
			play,
		});

		for (const event of getSpecialEvents(play).slice().reverse()) {
			items.push({
				kind: "special",
				id: `special-${play.atBatIndex}-${event.key}`,
				event,
			});
		}
	}

	return items;
};

export default function PreviousPlaysList({ gameData, height }: PreviousPlaysListProps) {
	const [showOnlyScoringPlays, setShowOnlyScoringPlays] = useState(false);
	const previousPlays = getPreviousPlays(gameData);
	const filteredPreviousPlays = showOnlyScoringPlays ? previousPlays.filter(isScoringPlay) : previousPlays;
	const items = buildPreviousPlayList(
		filteredPreviousPlays,
		showOnlyScoringPlays ? undefined : gameData.liveData.plays.currentPlay,
	);

	return (
		<div className="flex w-full max-w-lg flex-col overflow-hidden border border-slate-300 bg-white/80 xl:max-w-2xl xl:flex-[1.25]" style={{ height }}>
			<div className="flex items-center justify-between gap-4 border-b border-slate-300 px-4 py-3">
				<p className="text-sm font-semibold tracking-wide text-slate-700">Previous Plays</p>
				<label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
					<input
						type="checkbox"
						checked={showOnlyScoringPlays}
						onChange={(event) => setShowOnlyScoringPlays(event.target.checked)}
						className="h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-600"
					/>
					<span>Only Scoring Plays</span>
				</label>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
				<div className="flex flex-col gap-3">
					{filteredPreviousPlays.length === 0 ? (
						<div className="rounded-md border border-dashed border-slate-300 bg-slate-100 px-3 py-6 text-center text-sm text-slate-600">
							No scoring plays yet.
						</div>
					) : null}
					{items.map((item) => {
						if (item.kind === "inning") {
							return (
								<div key={item.id} className="rounded-md border border-dashed border-slate-300 bg-slate-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
									{item.label}
								</div>
							);
						}

						if (item.kind === "special") {
							const styles = getSpecialEventStyles(item.event);
							const description = item.event.description;
							const isMoundVisit = getNormalizedEventType(item.event.eventType) === "mound_visit";

							if (isMoundVisit) {
								return (
									<div key={item.id} className={clsx("rounded-lg border px-3 py-3 shadow-sm", styles.container)}>
										<p className="text-sm leading-5 text-slate-700">{description}</p>
									</div>
								);
							}

							return (
								<PlaySummaryCard
									key={item.id}
									badgeLabel={getSpecialEventBadgeLabel(item.event)}
									description={description}
									playerId={item.event.playerId}
									className={styles.container}
									badgeClassName={styles.badge}
									fallbackAvatarClassName="bg-white/70 ring-1 ring-black/5"
								/>
							);
						}

						const batter = getPlayerFromGumbo(gameData, item.play.matchup.batter.id);
						const badgeLabel = getPlayBadgeLabel(item.play);
						const scorecardCode = getScorecardCodeFromPlay(item.play);
						const description = item.play.result.description ?? "No description available.";
						const hitData = getHitDataFromPlay(item.play);
						const pitches = getMatchupPitchesFromPlay(item.play);
						const styles = getPlayStyles(item.play);

						return (
							<PlaySummaryCard
								key={item.id}
								badgeLabel={badgeLabel}
								scorecardCode={scorecardCode}
								description={description}
								playerId={batter?.id}
								hitData={hitData}
								pitches={pitches}
								strikeZoneTop={batter?.strikeZoneTop}
								strikeZoneBottom={batter?.strikeZoneBottom}
								className={styles.container}
								badgeClassName={styles.badge}
								scorecardCodeClassName={styles.scorecardCode}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}