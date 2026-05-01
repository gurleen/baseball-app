export function safeParseInt(value: string): number | undefined {
    try {
        return parseInt(value);
    }
    catch {
        return undefined;
    }
}