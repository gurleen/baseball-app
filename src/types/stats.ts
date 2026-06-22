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
