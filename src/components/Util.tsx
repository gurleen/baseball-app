export const VerticalDivider = ({className}: {className?: string}) => (
    <div className={`inline-block min-h-[1em] w-0.5 self-stretch bg-neutral-100 ${className}`} />
);

export const HorizontalDivider = ({className}: {className?: string}) => (
    <div className={`inline-block h-0.5 w-full self-stretch bg-neutral-100 ${className}`} />
);