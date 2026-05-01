import { BattingStats, type BattingStatsFilters } from "@/types/stats";
import z from "zod";

const BASE_URL = "https://baseball-api.gurleen.net/";

async function postRequest<TSchema extends z.ZodTypeAny>(path: string, data: any, schema: TSchema): Promise<z.infer<TSchema>> {
    const url = new URL(path, BASE_URL);
    const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: JSON.stringify(data),
    });
    const payload = await response.json();
    return schema.parse(payload);
}

export async function getBattingStats(filters: BattingStatsFilters): Promise<BattingStats[]> {
    return await postRequest("api/batting", filters, z.array(BattingStats));
}