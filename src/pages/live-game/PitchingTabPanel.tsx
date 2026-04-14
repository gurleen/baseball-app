import type { GumboFeed } from "@/types/gumbo";
import PitchingTable from "@/components/PitchingTable";
import { getLiveGamePanelId, getLiveGameTabId } from "./shared";

export default function PitchingTabPanel({ gameData }: { gameData: GumboFeed }) {
    const awayBoxScore = gameData.liveData.boxscore.teams.away;
    const homeBoxScore = gameData.liveData.boxscore.teams.home;

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("pitching")}
            aria-labelledby={getLiveGameTabId("pitching")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PitchingTable team={awayBoxScore} gameData={gameData} />
                <PitchingTable team={homeBoxScore} gameData={gameData} />
            </div>
        </div>
    );
}