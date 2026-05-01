import { calculateBattingStats } from "@/repository/statcast";
import { BattingStatsFilters } from "@/types/stats";

const CORS_HEADERS = {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
};

const jsonResponse = (data: any) => new Response(JSON.stringify(data), CORS_HEADERS);

const server = Bun.serve({
    routes: {
        "/api/batting": {
            POST: async (req) => {
                const body = await req.json();
                const filters = BattingStatsFilters.parse(body);
                const query = calculateBattingStats(filters).orderBy("woba", ob => ob.desc().nullsLast());
                const logs = await query.execute();
                return jsonResponse(logs);
            }
        }
    },
    port: 3001,
});

console.log(`Server running at http://localhost:${server.port}`);