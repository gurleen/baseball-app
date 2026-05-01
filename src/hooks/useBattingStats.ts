import { getBattingStats } from "@/server/client";
import { BattingStats, type BattingStatsFilters } from "@/types/stats";
import { useEffect, useState } from "react";

async function fetchStatsSafe(filters: BattingStatsFilters) {
    try {
        return getBattingStats(filters);
    }
    catch {
        return undefined;
    }
}

export function useBattingStats(filters: BattingStatsFilters) {
    const [data, setData] = useState<BattingStats[]>();
    const [isLoading, setIsLoading] = useState(false);
    const [errorOccured, setErrorOccured] = useState(false);

    useEffect(() => {
        const func = async () => {
            setIsLoading(true);
            setData(undefined);
            setErrorOccured(false);

            let stats = await fetchStatsSafe(filters);
            console.log("Got", stats?.length ?? 0, "rows back.")
            if(stats) { setData(stats); }
            else { setErrorOccured(true); }

            setIsLoading(false);
        }
        func();
    }, [filters]);

    return { data, isLoading, errorOccured };
}