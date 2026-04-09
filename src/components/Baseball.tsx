import { clsx } from 'clsx';

interface BaseballBaseProps {
    width?: number;
    occupied?: boolean;
}

interface BaseballDiamondProps {
    firstOccupied: boolean;
    secondOccupied: boolean;
    thirdOccupied: boolean;
    width?: number;
}

export const BaseballBase = ({ width, occupied = false }: BaseballBaseProps) => {
    return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width={width}>
            <rect
                x="22"
                y="22"
                width="56"
                height="56"
                rx="4"
                transform="rotate(45 50 50)"
                fill={occupied ? "#FBBF24" : "#E0E0E0"}
                stroke="#9CA3AF"
                strokeWidth="6"
            />
        </svg>
    );
};

export const BaseballDiamond = ({
    firstOccupied,
    secondOccupied,
    thirdOccupied,
    width = 120,
}: BaseballDiamondProps) => {
    const baseWidth = width / 3;
    const diamondHeight = width * 0.72;

    return (
        <div className="relative" style={{ width, height: diamondHeight }}>
            <div className="absolute left-0 bottom-0">
                <BaseballBase width={baseWidth} occupied={thirdOccupied} />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <BaseballBase width={baseWidth} occupied={secondOccupied} />
            </div>
            <div className="absolute right-0 bottom-0">
                <BaseballBase width={baseWidth} occupied={firstOccupied} />
            </div>
        </div>
    );
};


export const BaseballOut = ({ active }: { active: boolean }) => {
    const circleClass = clsx("rounded-full", active ? "bg-black" : "bg-gray-300");

    return (
        <div className={circleClass} style={{ width: 10, height: 10 }}></div>
    );
}

export const BaseballOuts = ({ outs }: { outs: number }) => {
    return (
        <div className="flex gap-1">
            <BaseballOut active={outs >= 1} />
            <BaseballOut active={outs >= 2} />
            <BaseballOut active={outs >= 3} />
        </div>
    )
}