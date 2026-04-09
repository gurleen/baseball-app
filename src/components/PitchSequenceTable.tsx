import type { ReactNode } from "react";
import clsx from "clsx";
import { getPitchCodeFromName, type MatchupPitch } from "@/types/gumbo";

interface PitchSequenceTableProps {
	pitches: MatchupPitch[];
	compact?: boolean;
	stickyHeader?: boolean;
	resultRow?: ReactNode;
	className?: string;
}

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

const formatPitchSpeed = (speed?: number, compact?: boolean) => {
    if (typeof speed !== "number" || !Number.isFinite(speed)) {
        return "-";
    }

    return `${speed.toFixed(1)}${compact ? "" : " mph"}`;
}

export default function PitchSequenceTable({
	pitches,
	compact = false,
	stickyHeader = false,
	resultRow,
	className,
}: PitchSequenceTableProps) {
	const tableClassName = compact ? "w-full table-fixed text-left text-xs text-slate-600" : "w-full table-fixed text-left text-sm";
	const headerClassName = clsx(stickyHeader && "sticky top-0 z-10", compact ? "bg-slate-100 text-slate-500" : "bg-slate-100 text-slate-600");
	const headerCellClassName = compact ? "px-2 py-2 font-semibold" : "px-3 py-2 font-semibold";
	const numberCellClassName = compact ? "px-2 py-2" : "px-4 py-2 font-semibold text-slate-700";
	const bodyCellClassName = compact ? "px-2 py-2" : "px-3 py-2 text-slate-700";
	const dotClassName = compact ? "inline-block h-2.5 w-2.5 rounded-full" : "inline-block h-3 w-3 rounded-full";
	const firstColumnWidth = compact ? "w-12" : "w-14";
	const veloWidth = compact ? "w-16" : "w-20";
	const typeWidth = compact ? "w-16" : "w-20";
	const countWidth = compact ? "w-16" : "w-18";
	const breakWidth = compact ? "w-18" : "w-20";

	return (
		<table className={clsx(tableClassName, className)}>
			<thead className={headerClassName}>
				<tr>
					<th className={clsx(firstColumnWidth, compact ? "px-2 py-2 font-semibold" : "px-4 py-2 font-semibold")}>#</th>
					<th className={clsx(veloWidth, headerCellClassName)}>Velo</th>
					<th className={clsx(typeWidth, headerCellClassName)}>Type</th>
					<th className={clsx(countWidth, headerCellClassName)}>Count</th>
					<th className={clsx(breakWidth, headerCellClassName)}>H-Break</th>
					<th className={clsx(breakWidth, headerCellClassName)}>V-Break</th>
				</tr>
			</thead>
			<tbody>
				{pitches.map((pitch, index) => (
					<tr key={`${index}-${pitch.pitchData.startSpeed ?? "pitch"}`} className="border-t border-slate-200 align-top">
						<td className={numberCellClassName}>
							<div className={clsx("flex items-center", compact ? "gap-1.5" : "gap-2")}>
								<span className={clsx(dotClassName, getPitchSequenceColor(pitch))}></span>
								<span>{index + 1}</span>
							</div>
						</td>
						<td className={bodyCellClassName}>
							{formatPitchSpeed(pitch.pitchData.startSpeed, compact)}
						</td>
						<td className={bodyCellClassName}>{formatPitchType(pitch.pitchType)}</td>
						<td className={bodyCellClassName}>{pitch.count ?? "-"}</td>
						<td className={bodyCellClassName}>{formatPitchBreak(pitch.pitchData.breaks?.breakHorizontal)}</td>
						<td className={bodyCellClassName}>{formatPitchBreak(pitch.pitchData.breaks?.breakVertical)}</td>
					</tr>
				))}
				{resultRow}
			</tbody>
		</table>
	);
}