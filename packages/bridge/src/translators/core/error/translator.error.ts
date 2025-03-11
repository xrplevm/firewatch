import { AnyObject } from "@swisstype/essential";

export class TranslatorError extends Error {
    message: string;
    data?: AnyObject;

    constructor(message: string, data?: AnyObject) {
        super(message);
        this.name = "TranslatorError";
        this.message = message;
        this.data = data;
    }
}
