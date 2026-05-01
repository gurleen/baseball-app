import type { BattingStatsFilters } from "@/types/stats";
import { db } from "@/util/database";
import { sql } from "kysely";

export function getBattingLogs(filters: BattingStatsFilters) {
    let query = db
        .selectFrom("batting_logs")
        .leftJoin("teams", "batting_logs.bat_team", "teams.abbreviation");

    if (filters.fromDate) {
        query = query.where("game_date", ">=", filters.fromDate);
    }

    if (filters.toDate) {
        query = query.where("game_date", "<=", filters.toDate);
    }

    if (filters.pitcherHand) {
        query = query.where("p_throws", "=", filters.pitcherHand);
    }

    if (filters.batterHand) {
        query = query.where("stand", "=", filters.batterHand);
    }

    if (filters.teams) {
        query = query.where("bat_team", "in", filters.teams);
    }

    if (filters.league) {
        query = query.where("teams.league", "=", filters.league);
    }

    return query.selectAll();
}

export function groupBattingLogs(filters: BattingStatsFilters) {
    return db
        .with("filtered_logs", () => getBattingLogs(filters))
        .selectFrom("filtered_logs")
        .groupBy(["batter", "game_year"])
        .select([
            "batter",
            "game_year",
            db.fn.sum("plate_appearance").as("pa"),
            db.fn.sum("at_bat").as("ab"),
            db.fn.sum("all_walks").as("bb"),
            db.fn.sum("walk").as("ubb"),
            db.fn.sum("intent_walk").as("ibb"),
            db.fn.sum("hit_by_pitch").as("hbp"),
            db.fn.sum("hit").as("h"),
            db.fn.sum("single").as("single"),
            db.fn.sum("double").as("double"),
            db.fn.sum("triple").as("triple"),
            db.fn.sum("home_run").as("hr"),
            db.fn.sum("sac_fly").as("sf"),
            db.fn.avg("estimated_woba_using_speedangle").as("xwoba"),
            db.fn.avg("estimated_ba_using_speedangle").as("xba"),
            db.fn.avg("estimated_slg_using_speedangle").as("xslg"),
        ]);
}

export function calculateBattingStats(filters: BattingStatsFilters) {
    const baseStats = () => {
        return db
        .with("grouped_logs", () => groupBattingLogs(filters))
        .selectFrom("grouped_logs")
        .leftJoin("players", "grouped_logs.batter", "players.id")
        .leftJoin("weights", "grouped_logs.game_year", "weights.game_year")
        .select([
            "players.id as id",
            "full_name",
            "grouped_logs.game_year",
            "pa",
            "ab",
            sql`CASE 
                    WHEN ab > 0 THEN round(h * 1.0 / ab, 3)::float 
                    ELSE NULL 
                END`.as("avg"),
            sql`CASE 
                    WHEN pa > 0 THEN round((h + bb + hbp) * 1.0 / pa, 3)::float
                    ELSE NULL 
                END`.as("obp"),
            sql`CASE 
                    WHEN ab > 0 THEN round((single + 2 * double + 3 * triple + 4 * hr) * 1.0 / ab, 3)::float
                    ELSE NULL 
                END`.as("slg"),
            sql`CASE
                    WHEN ab + bb - ibb + sf + hbp > 0 THEN round(
                        ((weights.w_bb * ubb + weights.w_hbp * hbp + weights.w_single * single + weights.w_double * double + weights.w_triple * triple + weights.w_home_run * hr) * 1.0 / (ab + bb - ibb + sf + hbp))::numeric
                    , 3)::float
                    ELSE 0
                END`.as("woba"),
            sql`round(xwoba::numeric, 3)::float`.as("xwoba"),
            sql`round(xba::numeric, 3)::float`.as("xba"),
            sql`round(xslg::numeric, 3)::float`.as("xslg"),
            sql`CASE
                    WHEN pa > 0 THEN round(bb * 1.0 / pa, 3)::float
                    ELSE 0
                END`.as("bb_rate")
        ])
    }

    let query = db
        .with("base_stats", () => baseStats())
        .with("qualification", () => db.selectFrom("player_is_qualified").select(["batter", "qualified"]))
        .with("team_info", () => db
            .selectFrom("players")
            .leftJoin("teams", "players.current_team_id", "teams.id")
            .select(["players.id", "abbreviation as team"])
        )
        .selectFrom("base_stats")
        .leftJoin("qualification", "base_stats.id", "qualification.batter")
        .leftJoin("team_info", "base_stats.id", "team_info.id")
        .select([
            "base_stats.id",
            "full_name",
            "team",
            "game_year as year",
            "pa",
            "ab",
            "avg",
            "obp",
            "slg",
            sql`slg + obp`.as("ops"),
            "woba",
            "xwoba",
            "xba",
            "xslg",
            "bb_rate"
        ]);

    if(filters.minPa && filters.minPa != null) { query = query.where("pa", ">=", filters.minPa); }
    if(filters.qualified) { query = query.where("qualified", "=", true); }

    return query;
}