import clsx from "clsx";

export interface CardProps {
    children?: React.ReactNode;
    className?: string;
}


export function Card({children, className} : CardProps) {
    const styles = clsx("bg-white border border-slate-200 p-4 shadow-lg", className);

    return (
        <div className={styles}>
            {children}
        </div>
    );
}