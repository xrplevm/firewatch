import { isValidUrl } from "../url/isValidUrl";

export type IsValidRpcUrlOptions = {
    validateUrl?: boolean;
};

/**
 * Validates if the given url is a valid rpc url.
 * @param url The url to validate.
 * @param options The validation options.
 * @returns Whether the url is a valid rpc url.
 */
export function isValidRpcUrl(url: string, { validateUrl = true }: IsValidRpcUrlOptions = {}) {
    return (!validateUrl || isValidUrl(url)) && /https?:\/\//u.test(url);
}
