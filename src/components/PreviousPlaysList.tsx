import clsx from "clsx";
import PlaySummaryCard from "@/components/PlaySummaryCard";
import { getHitDataFromPlay, getMatchupPitchesFromPlay, getPlayerFromGumbo, type GumboFeed, type Play, type PlayEvent } from "@/types/gumbo";

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
		event: PlayEvent;
	  }
	| {
		kind: "play";
		id: string;
		play: Play;
	  };

const SPECIAL_EVENT_TYPES = new Set(["pitching_substitution", "defensive_switch", "defensive_substitution", "mound_visit"]);

const formatInningLabel = (play: Play) => {
	const half = play.about.halfInning === "top" ? "Top" : "Bottom";
	return `${half} ${play.about.inning}`;
};

const getPlayBadgeLabel = (play: Play) => play.result.event ?? play.result.eventType ?? "Play";

const getSpecialEventBadgeLabel = (event: PlayEvent) => {
	if (event.details.eventType === "mound_visit") {
		return "Mound Visit";
	}

	if (event.details.eventType === "pitching_substitution") {
		return "Pitching Change";
	}

	if (event.details.eventType === "defensive_substitution" || event.details.eventType === "defensive_switch") {
		return "Defensive Change";
	}

	return event.details.event ?? "Update";
};

const getSpecialEventStyles = (event: PlayEvent) => {
	if (event.details.eventType === "mound_visit") {
		return {
			container: "border-amber-300 bg-amber-50",
			badge: "bg-amber-700 text-white",
		};
	}

	if (event.details.eventType === "pitching_substitution") {
		return {
			container: "border-rose-300 bg-rose-50",
			badge: "bg-rose-700 text-white",
		};
	}

	return {
		container: "border-sky-300 bg-sky-50",
		badge: "bg-sky-700 text-white",
	};
};

const getSpecialEvents = (play: Play) => {
	return play.playEvents.filter((event) => {
		const eventType = event.details.eventType;
		return typeof eventType === "string" && SPECIAL_EVENT_TYPES.has(eventType);
	});
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
					id: `special-current-${currentPlay.atBatIndex}-${event.index}`,
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
				id: `special-${play.atBatIndex}-${event.index}`,
				event,
			});
		}
	}

	return items;
};

export default function PreviousPlaysList({ gameData, height }: PreviousPlaysListProps) {
	const previousPlays = getPreviousPlays(gameData);
	const items = buildPreviousPlayList(previousPlays, gameData.liveData.plays.currentPlay);

	return (
		<div className="flex w-full max-w-lg flex-col overflow-hidden border border-slate-300 bg-white/80 xl:max-w-2xl xl:flex-[1.25]" style={{ height }}>
			<div className="border-b border-slate-300 px-4 py-3">
				<p className="text-sm font-semibold tracking-wide text-slate-700">Previous Plays</p>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
				<div className="flex flex-col gap-3">
					{items.map((item) => {
						if (item.kind === "inning") {
							return (
								<div key={item.id} className="rounded-md border border-dashed border-slate-300 bg-slate-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
									{item.label}
								</div>
							);
						}

						if (item.kind === "special") {
							const playerId = item.event.player?.id;
							const styles = getSpecialEventStyles(item.event);
							const description = item.event.details.description ?? "No description available.";
							const isMoundVisit = item.event.details.eventType === "mound_visit";

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
									playerId={playerId}
									className={styles.container}
									badgeClassName={styles.badge}
									fallbackAvatarClassName="bg-white/70 ring-1 ring-black/5"
								/>
							);
						}

						const batter = getPlayerFromGumbo(gameData, item.play.matchup.batter.id);
						const badgeLabel = getPlayBadgeLabel(item.play);
						const description = item.play.result.description ?? "No description available.";
						const hitData = getHitDataFromPlay(item.play);
						const pitches = getMatchupPitchesFromPlay(item.play);

						return (
							<PlaySummaryCard
								key={item.id}
								badgeLabel={badgeLabel}
								description={description}
								playerId={batter?.id}
								hitData={hitData}
								pitches={pitches}
								strikeZoneTop={batter?.strikeZoneTop}
								strikeZoneBottom={batter?.strikeZoneBottom}
								className="border-slate-200 bg-white"
								badgeClassName="bg-slate-900"
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}