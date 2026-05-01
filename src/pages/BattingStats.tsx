import { Card } from "@/components/ui/Card";
import { BattingStats, BattingStatsFilters, HandednessOptions, TeamOptions } from "@/types/stats";
import DatePicker from "react-datepicker";
import { useImmer, type Updater } from "use-immer";
import Select from 'react-select'
import { useMemo, useState } from "react";

// @ts-ignore
import "react-datepicker/dist/react-datepicker.css";
import { useBattingStats } from "@/hooks/useBattingStats";
import { AgGridReact } from "ag-grid-react";
import { themeBalham, type ColDef, type GridReadyEvent, type ValueFormatterParams } from "ag-grid-community";
import { safeParseInt } from "@/util/parse";

interface LabeledDatePickerProps {
    label: string;
    selected: Date | undefined;
    onChange: (d: Date | undefined) => void;
}

function LabeledDatePicker({ label, selected, onChange }: LabeledDatePickerProps) {
    const innerOnChange = (d: Date | null) => d ? onChange(d) : onChange(undefined);

    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-sm font-light text-slate-800">{label}</p>
            <DatePicker className="border border-slate-300 inset-shadow-sm p-1"
                selected={selected} onSelect={innerOnChange} />
        </div>
    );
}

const defaultFilters: BattingStatsFilters = {
    fromDate: new Date(2026, 2, 1),
    toDate: new Date(2026, 10, 1),
    qualified: true
}

type FiltersState = {
    filters: BattingStatsFilters;
    setFilters: Updater<BattingStatsFilters>;
}

function FiltersCard({ filters, setFilters }: FiltersState) {
    const setTeams = (ts: string[]) => {
        if (ts.length > 0) { setFilters(f => { f.teams = ts }) }
        else { setFilters(f => { f.teams = undefined }); }
    }

    return (
        <Card className="flex flex-col min-w-full md:min-w-2xl md:max-w-4xl gap-2 z-50">

            <div className="flex w-full">
                <p className="font-bold">Batting Statistics Search</p>
            </div>

            <div className="flex flex-wrap gap-5 items-center px-5">
                <LabeledDatePicker label="From" selected={filters.fromDate} onChange={d => setFilters(f => { f.fromDate = d })} />
                <LabeledDatePicker label="To" selected={filters.toDate} onChange={d => setFilters(f => { f.toDate = d })} />

                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-light text-slate-800">Pitcher Hand</p>
                    <Select className="w-40" defaultValue={undefined} options={HandednessOptions} onChange={h => setFilters(f => { f.pitcherHand = h?.value })} />
                </div>

                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-light text-slate-800">Batter Hand</p>
                    <Select className="w-40" defaultValue={undefined} options={HandednessOptions} onChange={h => setFilters(f => { f.batterHand = h?.value })} />
                </div>

                <div className="flex gap-2 items-center">
                    <input className="cursor-pointer inset-shadow-sm" type="checkbox" checked={filters.qualified} onChange={e => setFilters(f => { f.qualified = e.target.checked })} />
                    <p className="text-md underline text-slate-800">Qualified</p>
                </div>

                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-light text-slate-800">Bat Team</p>
                    <Select className="w-60" defaultValue={undefined} options={TeamOptions} isMulti onChange={ts => setTeams(ts.map(t => t?.value ?? ""))} />
                </div>

                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-light text-slate-800">Min PA</p>
                    <input className="border border-slate-300 inset-shadow-sm" type="number" value={filters.minPa ?? undefined} onChange={e => setFilters(f => {f.minPa = safeParseInt(e.target.value)})} />
                </div>
            </div>
        </Card>
    );
}

function formatPercentage(value: number | undefined | null): string {
    if (!value) { return "--"; }
    const formatted = value.toLocaleString('en-us', { minimumFractionDigits: 3 });
    if (formatted.startsWith("0.")) { return formatted.slice(1); }
    return formatted;
}


export default function BattingStatsPage() {
    const [filters, setFilters] = useImmer<BattingStatsFilters>(defaultFilters);
    const { data, isLoading, errorOccured } = useBattingStats(filters);
    const [colDefs, setColDefs] = useState<ColDef<BattingStats>[]>(([
        { field: "full_name", headerName: "Name" },
        { field: "pa", headerName: "PA", type: "numericColumn" },
        { field: "ab", headerName: "AB", type: "numericColumn" },
        { field: "avg", headerName: "AVG", valueFormatter: p => formatPercentage(p.value), type: "numericColumn" },
        { field: "obp", headerName: "OBP", valueFormatter: p => formatPercentage(p.value), type: "numericColumn" },
        { field: "slg", headerName: "SLG", valueFormatter: p => formatPercentage(p.value), type: "numericColumn" },
        { field: "ops", headerName: "OPS", valueFormatter: p => formatPercentage(p.value), type: "numericColumn" },
        { field: "woba", headerName: "wOBA", valueFormatter: p => formatPercentage(p.value), type: "numericColumn" },
        { field: "xwoba", headerName: "xwOBA", valueFormatter: p => formatPercentage(p.value), type: "numericColumn" },
        // { field: "xba", headerName: "xBA", valueFormatter: p => formatPercentage(p.value) },
        // { field: "xslg", headerName: "xSLG", valueFormatter: p => formatPercentage(p.value) },
        { field: "bb_rate", headerName: "BB%", valueFormatter: p => formatPercentage(p.value), type: "numericColumn" }
    ]));

    const onGridReady = (e: GridReadyEvent<BattingStats>) => {
        e.api.autoSizeAllColumns();
    }

    return (
        <main className="bg-gray-500/10 h-[95svh] w-full py-5 flex flex-col gap-4 items-center font-mono">
            <div className="flex flex-col items-center gap-3 w-full">
                <FiltersCard filters={filters} setFilters={setFilters} />

                <Card className="h-140 w-full md:w-4xl">
                    <AgGridReact rowData={data} defaultColDef={{ resizable: false, cellDataType: false }} 
                        animateRows={false} columnDefs={colDefs} autoSizeStrategy={{ type: "fitCellContents" }} 
                        onGridReady={onGridReady} theme={themeBalham} suppressMovableColumns loading={isLoading} />
                </Card>
            </div>
        </main>
    );
}