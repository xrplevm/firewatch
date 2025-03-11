import { AnyObject } from "@swisstype/essential";

export class SignerError extends Error {
    message: string;
    data?: AnyObject;

    constructor(message: string, data?: AnyObject) {
        super(message);
        this.name = "SignerError";
        this.message = message;
        this.data = data;
    }
}
