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

const clampToPositive = (value: number) => (Number.isFinite(value) ? Math.max(value, 0) : 0);
const isMatchupPitch = (pitch: StrikeZonePitch): pitch is MatchupPitch => "pitchData" in pitch;

export const getStrikeZoneHeight = ({
	strikeZoneTop,
	strikeZoneBottom,
	width,
}: StrikeZoneDimensionsInput) => {
	const safeTop = clampToPositive(strikeZoneTop);
	const safeBottom = clampToPositive(Math.min(strikeZoneBottom, safeTop));
	const zoneHeightFeet = Math.max(safeTop - safeBottom, 0.1);
	const sidePaddingFeet = 0.7;
	const upperPaddingFeet = 0.7;
	const lowerPaddingFeet = 0.45;
	const viewWidthFeet = STRIKE_ZONE_WIDTH_FEET + sidePaddingFeet * 2;
	const viewHeightFeet = safeTop + upperPaddingFeet + lowerPaddingFeet;

	return width * (viewHeightFeet / viewWidthFeet);
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
	const zoneHeightFeet = Math.max(safeTop - safeBottom, 0.1);

	const sidePaddingFeet = 0.7;
	const upperPaddingFeet = 0.7;
	const lowerPaddingFeet = 0.45;

	const viewWidthFeet = STRIKE_ZONE_WIDTH_FEET + sidePaddingFeet * 2;
	const viewHeightFeet = safeTop + upperPaddingFeet + lowerPaddingFeet;
	const height = getStrikeZoneHeight({ strikeZoneTop, strikeZoneBottom, width });

	const horizontalScale = width / viewWidthFeet;
	const verticalScale = height / viewHeightFeet;

	const zoneLeft = sidePaddingFeet * horizontalScale;
	const zoneWidth = STRIKE_ZONE_WIDTH_FEET * horizontalScale;
	const zoneTopY = (upperPaddingFeet + (safeTop - safeTop)) * verticalScale;
	const zoneBottomY = (upperPaddingFeet + zoneHeightFeet) * verticalScale;
	const zoneHeight = zoneBottomY - zoneTopY;
	const columnWidth = zoneWidth / 3;
	const rowHeight = zoneHeight / 3;
	const groundY = (upperPaddingFeet + safeTop + lowerPaddingFeet * 0.72) * verticalScale;
	const plateTopY = groundY + 8;
	const plateDepth = 22;
	const plateShoulderInset = zoneWidth * 0.18;
	const platePointDepth = 14;
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
				cy: (upperPaddingFeet + (safeTop - pitchZ)) * verticalScale,
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
						`M ${zoneLeft} ${plateTopY}`,
						`L ${zoneLeft + zoneWidth} ${plateTopY}`,
						`L ${zoneLeft + zoneWidth - plateShoulderInset} ${plateTopY + plateDepth * 0.45}`,
						`L ${zoneLeft + zoneWidth / 2} ${plateTopY + plateDepth + platePointDepth}`,
						`L ${zoneLeft + plateShoulderInset} ${plateTopY + plateDepth * 0.45}`,
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
