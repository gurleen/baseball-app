import type { GumboFeed } from "@/types/gumbo";
import OffenseTable from "@/components/OffenseTable";
import { getLiveGamePanelId, getLiveGameTabId } from "./shared";

export default function OffenseTabPanel({ gameData }: { gameData: GumboFeed }) {
    const awayBoxScore = gameData.liveData.boxscore.teams.away;
    const homeBoxScore = gameData.liveData.boxscore.teams.home;

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("offense")}
            aria-labelledby={getLiveGameTabId("offense")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <OffenseTable team={awayBoxScore} />
                <OffenseTable team={homeBoxScore} />
            </div>
        </div>
    );
}