export const PlayerImage = ({ playerId, size = 64 }: { playerId: number; size?: number }) => {
    const imageUrl = `https://midfield.mlbstatic.com/v1/people/${playerId}/silo/120`;
    return <img src={imageUrl} alt="Player" width={size} height={size} />;
}