import { BattingStatsRow, type BattingStatsFilters } from "@/types/stats";
import { db } from "@/util/database";
import { sql } from "kysely";

export async function getFilteredBattingStats(filters: BattingStatsFilters) {
    const { fromDate, toDate, minPa, qualified, batterHand, pitcherHand, teams, league } = filters;

    const fnCall = sql<BattingStatsRow>`get_batting_stats(
      ${fromDate},
      ${toDate},
      ${qualified},
      ${pitcherHand},
      ${batterHand},
      NULL,
      ${league}
    )`.as('stats');
    
    let query = db.selectFrom(fnCall);
    
    if(minPa) { query = query.where("pa", ">=", minPa); }
    if(teams) { query = query.where("team", "in", teams); }

    query = query.selectAll();
    return await query.execute();
}