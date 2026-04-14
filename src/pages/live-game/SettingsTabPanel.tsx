import type { MatchupPitch } from "@/types/gumbo";
import PitchSequenceTable from "@/components/PitchSequenceTable";
import clsx from "clsx";
import { getLiveGamePanelId, getLiveGameTabId } from "./shared";

const formatDelayDuration = (delayMs: number) => {
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
        return "No delay";
    }

    if (delayMs < 1000) {
        return `${delayMs} ms`;
    }

    return `${(delayMs / 1000).toFixed(1)} sec`;
};

export default function SettingsTabPanel({
    latestPitch,
    displayDelayMs,
    calibrationPitchReceivedAt,
    onSubtractSecond,
    onAddSecond,
    onResumeCalibration,
    onResetDelay,
}: {
    latestPitch: MatchupPitch | null;
    displayDelayMs: number;
    calibrationPitchReceivedAt: number | null;
    onSubtractSecond: () => void;
    onAddSecond: () => void;
    onResumeCalibration: () => void;
    onResetDelay: () => void;
}) {
    const canCalibrate = Boolean(latestPitch);

    return (
        <div
            role="tabpanel"
            id={getLiveGamePanelId("settings")}
            aria-labelledby={getLiveGameTabId("settings")}
            className="border border-t-0 border-slate-300 bg-white/40 px-4 py-5"
        >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
                <section className="overflow-hidden border border-slate-300 bg-white/80">
                    <div className="border-b border-slate-300 px-4 py-3">
                        <p className="text-sm font-semibold tracking-wide text-slate-700">Live Feed Delay</p>
                    </div>
                    <div className="flex flex-col gap-4 p-4 text-sm text-slate-700">
                        <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold tracking-wide text-slate-500">CURRENT DELAY</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{formatDelayDuration(displayDelayMs)}</p>
                            <p className="mt-1 text-xs text-slate-500">New live updates wait this long before they appear on the page.</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={onSubtractSecond}
                                    disabled={displayDelayMs === 0}
                                    className={clsx(
                                        "rounded border px-3 py-1.5 text-xs font-semibold transition duration-200",
                                        displayDelayMs === 0
                                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            : "border-slate-300 bg-white text-slate-700 hover:cursor-pointer",
                                    )}
                                >
                                    -1 sec
                                </button>
                                <button
                                    type="button"
                                    onClick={onAddSecond}
                                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:cursor-pointer"
                                >
                                    +1 sec
                                </button>
                            </div>
                        </div>

                        <div className="rounded border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs font-semibold tracking-wide text-slate-500">HOW TO CALIBRATE</p>
                            {canCalibrate ? (
                                <p className="mt-2 leading-6 text-slate-700">
                                    This pitch is frozen while the settings tab stays open. Click play when the same pitch appears on your TV broadcast, and the elapsed time since this pitch arrived will become the feed delay.
                                </p>
                            ) : (
                                <p className="mt-2 leading-6 text-slate-700">
                                    Wait for the next pitch to appear here, then click play when that same pitch reaches your TV broadcast.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={onResumeCalibration}
                                disabled={!canCalibrate || calibrationPitchReceivedAt == null}
                                className={clsx(
                                    "rounded border px-4 py-2 text-sm font-semibold transition duration-200",
                                    canCalibrate && calibrationPitchReceivedAt != null
                                        ? "border-emerald-700 bg-emerald-700 text-white hover:cursor-pointer"
                                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                                )}
                            >
                                Play
                            </button>
                            <button
                                type="button"
                                onClick={onResetDelay}
                                disabled={displayDelayMs === 0}
                                className={clsx(
                                    "rounded border px-4 py-2 text-sm font-semibold transition duration-200",
                                    displayDelayMs === 0
                                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                        : "border-slate-300 bg-white text-slate-700 hover:cursor-pointer",
                                )}
                            >
                                Reset Delay
                            </button>
                        </div>

                        <p className="text-xs text-slate-500">
                            {canCalibrate && calibrationPitchReceivedAt != null
                                ? "The calibration pitch is locked below. Click play when you see that same pitch on TV."
                                : "The feed is currently playing with the configured delay."}
                        </p>
                    </div>
                </section>

                <section className="overflow-hidden border border-slate-300 bg-white/80">
                    <div className="border-b border-slate-300 px-4 py-3">
                        <p className="text-sm font-semibold tracking-wide text-slate-700">Calibration Pitch</p>
                    </div>
                    <div className="p-4">
                        {latestPitch ? (
                            <div className="max-w-sm overflow-hidden rounded border border-slate-200 bg-white">
                                <PitchSequenceTable pitches={[latestPitch]} compact />
                            </div>
                        ) : (
                            <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                                No pitch is available yet. The most recent pitch will appear here once the live feed receives one.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}