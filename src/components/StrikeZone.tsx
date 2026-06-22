import type { MatchupPitch, PitchData } from "@/types/gumbo";

type StrikeZonePitch = PitchData | MatchupPitch;

interface StrikeZoneProps {
	strikeZoneTop: number;
	strikeZoneBottom: number;
	pitches?: StrikeZonePitch[];
	width?: number;
	className?: string;
}

interface StrikeZoneDimensionsInput {
	strikeZoneTop: number;
	strikeZoneBottom: number;
	width: number;
}

const STRIKE_ZONE_WIDTH_INCHES = 17;
const INCHES_PER_FOOT = 12;
const STRIKE_ZONE_WIDTH_FEET = STRIKE_ZONE_WIDTH_INCHES / INCHES_PER_FOOT;

// The widget is drawn against a fixed vertical frame so the ground line and
// home plate stay put while the strike zone box rises/sinks and grows/shrinks
// with each batter. FRAME_TOP_FEET is the height above the ground represented
// by the top of the drawing area; it carries enough headroom for the tallest
// realistic zone top (~3.8 ft).
const SIDE_PADDING_FEET = 0.7;
// Room below the ground line for the foreshortened home plate plus a small margin.
const LOWER_PADDING_FEET = 0.95;
const FRAME_TOP_FEET = 4.2;
const VIEW_WIDTH_FEET = STRIKE_ZONE_WIDTH_FEET + SIDE_PADDING_FEET * 2;
const VIEW_HEIGHT_FEET = FRAME_TOP_FEET + LOWER_PADDING_FEET;

const clampToPositive = (value: number) => (Number.isFinite(value) ? Math.max(value, 0) : 0);
const isMatchupPitch = (pitch: StrikeZonePitch): pitch is MatchupPitch => "pitchData" in pitch;

// The frame is fixed, so the height depends only on the widget width. The
// batter dimensions are still accepted for a stable call signature.
export const getStrikeZoneHeight = ({ width }: StrikeZoneDimensionsInput) => {
	return width * (VIEW_HEIGHT_FEET / VIEW_WIDTH_FEET);
};

const getPitchMarkerColor = (pitch: StrikeZonePitch) => {
	if (!isMatchupPitch(pitch)) {
		return "#0F172ACC";
	}

	if (pitch.isInPlay && pitch.isOut) {
		return "#7C3AED";
	}

	if (pitch.isInPlay) {
		return "#2563EB";
	}

	if (pitch.isStrike) {
		return "#DC2626";
	}

	if (pitch.isBall) {
		return "#16A34A";
	}

	return "#0F172ACC";
};

export function StrikeZone({
	strikeZoneTop,
	strikeZoneBottom,
	pitches = [],
	width = 260,
	className,
}: StrikeZoneProps) {
	const safeTop = clampToPositive(strikeZoneTop);
	const safeBottom = clampToPositive(Math.min(strikeZoneBottom, safeTop));
	// Clamp the drawn top to the frame so an unusually tall zone never spills
	// off the top of the widget.
	const displayTop = Math.min(safeTop, FRAME_TOP_FEET);

	const height = getStrikeZoneHeight({ strikeZoneTop, strikeZoneBottom, width });

	const horizontalScale = width / VIEW_WIDTH_FEET;
	const verticalScale = height / VIEW_HEIGHT_FEET;

	// Map a height above the ground (in feet) to a y coordinate in the fixed frame.
	const yForHeight = (feet: number) => (FRAME_TOP_FEET - feet) * verticalScale;

	const zoneLeft = SIDE_PADDING_FEET * horizontalScale;
	const zoneWidth = STRIKE_ZONE_WIDTH_FEET * horizontalScale;
	const zoneTopY = yForHeight(displayTop);
	const zoneBottomY = yForHeight(safeBottom);
	const zoneHeight = zoneBottomY - zoneTopY;
	const columnWidth = zoneWidth / 3;
	const rowHeight = zoneHeight / 3;
	const groundY = yForHeight(0);

	// Home plate as the catcher sees it from a low vantage. The regulation plate
	// is a 17 in edge facing the pitcher, two 8.5 in parallel sides, and two 12 in
	// edges meeting at a right-angle point facing the catcher. Drawn in
	// perspective: the far (pitcher-side) edge recedes so it appears narrower at
	// the top, the sides widen toward the viewer to the near shoulders, and the
	// point comes toward the viewer at the bottom. The depth is foreshortened so
	// the plate reads as lying flat on the ground rather than standing upright.
	const plateWidth = zoneWidth;
	const plateGap = verticalScale * 0.08;
	const plateDepth = plateWidth * 0.52;
	const plateBackHalf = (plateWidth / 2) * 0.72;
	const plateShoulderHalf = plateWidth / 2;
	const plateCenterX = zoneLeft + zoneWidth / 2;
	const plateTopY = groundY + plateGap;
	const plateShoulderY = plateTopY + plateDepth * 0.45;
	const platePointY = plateTopY + plateDepth;
	const pitchRadius = Math.max(4, zoneWidth * 0.055);

	const plottedPitches = pitches
		.map((pitch, index) => {
			const pitchData = isMatchupPitch(pitch) ? pitch.pitchData : pitch;
			const pitchX = pitchData.coordinates?.pX;
			const pitchZ = pitchData.coordinates?.pZ;

			if (typeof pitchX !== "number" || typeof pitchZ !== "number") {
				return null;
			}

			if (!Number.isFinite(pitchX) || !Number.isFinite(pitchZ)) {
				return null;
			}

			return {
				id: `${index}-${pitchData.startSpeed ?? "pitch"}`,
				label: index + 1,
				cx: zoneLeft + zoneWidth / 2 + pitchX * horizontalScale,
				cy: yForHeight(pitchZ),
				fill: getPitchMarkerColor(pitch),
			};
		})
		.filter((pitch): pitch is { id: string; label: number; cx: number; cy: number; fill: string } => pitch !== null);

	const pitchLabelSize = Math.max(8, pitchRadius * 0.95);
	return (
		<div className={className}>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				width={width}
				height={height}
				role="img"
				aria-label="MLB strike zone from the catcher's perspective"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<linearGradient id="strike-zone-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
						<stop offset="100%" stopColor="#B45309" stopOpacity="0.08" />
					</linearGradient>
				</defs>

				<line
					x1={zoneLeft - 30}
					y1={groundY}
					x2={zoneLeft + zoneWidth + 30}
					y2={groundY}
					stroke="#A8A29E"
					strokeWidth="2"
				/>

				<rect
					x={zoneLeft}
					y={zoneTopY}
					width={zoneWidth}
					height={zoneBottomY - zoneTopY}
					rx="10"
					fill="url(#strike-zone-fill)"
					stroke="#92400E"
					strokeWidth="3"
				/>

				<line
					x1={zoneLeft + columnWidth}
					y1={zoneTopY}
					x2={zoneLeft + columnWidth}
					y2={zoneBottomY}
					stroke="#78350F"
					strokeDasharray="5 4"
					strokeWidth="1.5"
				/>
				<line
					x1={zoneLeft + columnWidth * 2}
					y1={zoneTopY}
					x2={zoneLeft + columnWidth * 2}
					y2={zoneBottomY}
					stroke="#78350F"
					strokeDasharray="5 4"
					strokeWidth="1.5"
				/>
				<line
					x1={zoneLeft}
					y1={zoneTopY + rowHeight}
					x2={zoneLeft + zoneWidth}
					y2={zoneTopY + rowHeight}
					stroke="#78350F"
					strokeDasharray="5 4"
					strokeWidth="1.5"
				/>
				<line
					x1={zoneLeft}
					y1={zoneTopY + rowHeight * 2}
					x2={zoneLeft + zoneWidth}
					y2={zoneTopY + rowHeight * 2}
					stroke="#78350F"
					strokeDasharray="5 4"
					strokeWidth="1.5"
				/>

				{plottedPitches.map((pitch) => (
					<g key={pitch.id}>
						<circle
							cx={pitch.cx}
							cy={pitch.cy}
							r={pitchRadius}
							fill={pitch.fill}
							stroke="#F8FAFC"
							strokeWidth="1.5"
						/>
						<text
							x={pitch.cx}
							y={pitch.cy}
							textAnchor="middle"
							dominantBaseline="central"
							fill="#F8FAFC"
							fontSize={pitchLabelSize}
							fontWeight="700"
						>
							{pitch.label}
						</text>
					</g>
				))}

				<path
					d={[
						`M ${plateCenterX - plateBackHalf} ${plateTopY}`,
						`L ${plateCenterX + plateBackHalf} ${plateTopY}`,
						`L ${plateCenterX + plateShoulderHalf} ${plateShoulderY}`,
						`L ${plateCenterX} ${platePointY}`,
						`L ${plateCenterX - plateShoulderHalf} ${plateShoulderY}`,
						'Z',
					].join(' ')}
					fill="#F5F5F4"
					stroke="#78716C"
					strokeWidth="2"
				/>
			</svg>
		</div>
	);
}

export default StrikeZone;
