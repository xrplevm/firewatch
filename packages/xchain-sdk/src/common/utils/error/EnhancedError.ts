import { Parametrize, Split } from "@swisstype/string";

export type EnhancedErrorArgs<E extends string> = Split<`${E} `, `{{${string}}}`>["length"] extends 1
    ? [message: E]
    : [message: E, params: Parametrize<E, "{{", "}}">];

/**
 * An EnhancedError that allows message parametrization.
 */
export class EnhancedError<E extends string> extends Error {
    constructor(...args: EnhancedErrorArgs<E>) {
        const [message, params] = args;
        const parsedMessage = params
            ? Object.entries(params).reduce((acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, "g"), value as string), message)
            : message;
        super(parsedMessage);
    }
}
