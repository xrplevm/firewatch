import { isValidUrl } from "./isValidUrl";

export type IsValidWsUrlOptions = {
    validateUrl?: boolean;
};

/**
 * Validates if the given url is a valid ws url.
 * @param url The url to validate.
 * @param options The validation options.
 * @returns Whether the url is a valid ws url.
 */
export function isValidWsUrl(url: string, { validateUrl = true }: IsValidWsUrlOptions = {}): boolean {
    return (!validateUrl || isValidUrl(url)) && /wss?(?:\+unix)?:\/\//u.test(url);
}
