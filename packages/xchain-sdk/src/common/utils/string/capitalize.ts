/**
 * Capitalizes a string.
 * @param str The string to capitalize.
 * @returns The capitalized string.
 */
export function capitalize<S extends string>(str: S): Capitalize<Lowercase<S>> {
    return (str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()) as Capitalize<Lowercase<S>>;
}
