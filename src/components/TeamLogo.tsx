export function TeamLogo({ teamId, width }: { teamId: number; width?: number }) {
    const logoUrl = `https://www.mlbstatic.com/team-logos/team-cap-on-light/${teamId}.svg`;
    return <img src={logoUrl} alt="Team Logo" width={width} />;
}