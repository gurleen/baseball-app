import * as z from "zod"; 

export const OptionalNum = z.number().nullable().optional();

export const Handedness = z.enum(["L", "R", "S"]);
export type Handedness = z.infer<typeof Handedness>;
export const HandednessOptions: { value: Handedness, label: string }[] = [
    { value: "L", label: "Left" },
    { value: "R", label: "Right" },
    { value: "S", label: "Switch" },
]

export const League = z.enum(["NL", "AL"]);

export const BattingStatsFilters = z.object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    minPa: z.number().nullable().optional(),
    qualified: z.boolean().optional(),
    batterHand: Handedness.optional(),
    pitcherHand: Handedness.optional(),
    teams: z.array(z.string()).optional(),
    league: League.optional()
});

export type BattingStatsFilters = z.infer<typeof BattingStatsFilters>;

export const BattingStats = z.object({
    id: z.number(),
    full_name: z.string(),
    team: z.string(),
    pa: z.number(),
    ab: z.number(),
    avg: z.number().nullable(),
    obp: z.number().nullable(),
    slg: z.number().nullable(),
    ops: z.number().nullable(),
    woba: z.number().nullable(),
    xwoba: z.number().nullable(),
    xba: z.number().nullable(),
    xslg: z.number().nullable(),
    bb_rate: z.number().nullable()
});

export type BattingStats = z.infer<typeof BattingStats>;

/*

*/

export const Teams = [
"ATH",
"PIT",
"SD",
"SEA",
"SF",
"STL",
"TB",
"TEX",
"TOR",
"MIN",
"PHI",
"ATL",
"CWS",
"MIA",
"NYY",
"MIL",
"LAA",
"AZ",
"BAL",
"BOS",
"CHC",
"CIN",
"CLE",
"COL",
"DET",
"HOU",
"KC",
"LAD",
"WSH",
"NYM"
];

export const TeamOptions = Teams.map(x => ({ value: x, label: x })).sort((a, b) => a.value.localeCompare(b.value));

export const BattingStatsRow = z.object({
    player_id: z.number(),
    full_name: z.string(),
    position_name: z.string().nullable(),
    team: z.string().nullable(),
    league: z.string().nullable(),
    pa: z.number(),
    ab: z.number(),
    avg: OptionalNum,
    obp: OptionalNum,
    slg: OptionalNum,
    ops: OptionalNum,
    babip: OptionalNum,
    woba: OptionalNum,
    wraa: OptionalNum,
    wrc: OptionalNum,
    wrc_plus: OptionalNum,
    bb_pct: OptionalNum,
    so_pct: OptionalNum
});

export type BattingStatsRow = z.infer<typeof BattingStatsRow>;