/**
 * Validates if the given url is valid.
 * @param url The url to validate.
 * @returns Whether the url is valid.
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}
