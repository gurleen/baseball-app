import clsx from "clsx";
import { Link } from "react-router";

export interface LinkButtonProps {
    href: string;
    children: React.ReactNode;
    className?: string;
}


export function LinkButton({ href, children, className }: LinkButtonProps) {
    const buttonClasses = clsx(
        "underline",
        "decoration-transparent",
        "transition-colors",
        "duration-150",
        "hover:decoration-current",
        className,
    );

    return (
        <Link to={href} className={buttonClasses}>
            {children} ↗
        </Link>
    )
}